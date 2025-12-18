import {
  print,
  fileToBuffer, Item, sessionStorage, cliExecute, gametimeToInt, waitq
} from "kolmafia";

import {
  Kmail, $item, $items
} from "libram";


function returnItems(kmail: Kmail, message: string) {
  kmail.reply(
    message,
    kmail.items()
  )
  kmail.delete()
}

type RecipePlanStep = {
  recipe: Recipe,
  quantity: number,
}

type Ingredient = {
  ingredient: Item,
  quantity: number,
}

type ChooseRecipesOutput = {
  recipePlan: RecipePlanStep[],
  output: Ingredient[],
}

function chooseRecipes(ingredients: Ingredient[]): ChooseRecipesOutput {
  const plausibleRecipeSteps: RecipePlanStep[] = []
  for (const { ingredient } of ingredients) {
    const recipesForIngredient = recipesByIngredient.get(ingredient.name) || []
    for (let recipe of recipesForIngredient) {
      if (!plausibleRecipeSteps.some(existingRecipeStep => existingRecipeStep.recipe.id === recipe.id))
        if (recipe.inputs.every(input => ingredients.some(ingredient => ingredient.ingredient.name === input))) {
          const quantities = ingredients
            .filter(ingredient => recipe.inputs.some(input => ingredient.ingredient.name === input))
            .map(ingredient => ingredient.quantity)
          plausibleRecipeSteps.push({ recipe, quantity: Math.min(...quantities) })
        }
    }
  }


  if (!plausibleRecipeSteps.length) {
    return {
      recipePlan: [] as RecipePlanStep[],
      output: ingredients
    }
  }
  plausibleRecipeSteps.sort((a, b) => b.quantity - a.quantity)
  const selectedRecipeStep = plausibleRecipeSteps[0]
  const newIngredients: Ingredient[] = []
  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i]
    if (selectedRecipeStep.recipe.inputs.includes(ingredient.ingredient.name)) {
      if (ingredient.quantity > selectedRecipeStep.quantity) {
        newIngredients.push({ ingredient: ingredient.ingredient, quantity: ingredient.quantity - selectedRecipeStep.quantity }
        )
      }
    } else {
      newIngredients.push(ingredient)
    }
  }

  newIngredients.push({ ingredient: $item`${selectedRecipeStep.recipe.output}`, quantity: selectedRecipeStep.quantity })

  const recursiveStep = chooseRecipes(newIngredients)
  return {
    recipePlan: [selectedRecipeStep].concat(recursiveStep.recipePlan),
    output: recursiveStep.output
  }
}


function processKmail(kmail: Kmail) {

  print("-------------------------------------------------------------------")
  print(`Started processing kmail from ${kmail.senderName}`)
  const items: Map<Item, number> = kmail.items();
  const spookies: number = items.has($item`spooky nuggets`) ? items.get($item`spooky nuggets`) as number : 0;
  const ingredients = Array.from(items.entries())
    .filter(([item, _quantity]) => !$items`spooky nuggets`.includes(item))


  print(`Recieved ${spookies} handful${spookies !== 1 ? "s" : ""} of spooky nuggets`)
  print(`Ingredients:`)
  if (!ingredients.length) print("- None found")
  ingredients.map(([item, quantity]) => print(`- ${item.name} x ${quantity}`))

  const recipesToAttempt = chooseRecipes(ingredients.map(([ingredient, quantity]) => ({ ingredient, quantity })))
  if (!recipesToAttempt.recipePlan.length) {
    returnItems(kmail, "I couldn't find any recipes that are made with those ingredients. If you believe this is incorrect, please send a message to Phillammon (#2393910) explaining what you were trying to do.")
    return
  }
  print("Crafting Plan:")
  for (const recipeStep of recipesToAttempt.recipePlan) {
    print(`- Make ${recipeStep.recipe.output} x ${recipeStep.quantity} via ${JSON.stringify(recipeStep.recipe.method)} from ${recipeStep.recipe.inputs.map(input => `${input} x${recipeStep.quantity}`).join(", ")}`)
  }
  print("Final Outputs:")
  for (const output of recipesToAttempt.output) {
    print(`- ${output.ingredient.name} x ${output.quantity}`)
  }

  for (const recipeStep of recipesToAttempt.recipePlan) {
    cliExecute(`refresh inventory`)
    cliExecute(`create ${recipeStep.quantity} ${recipeStep.recipe.output}`)
  }

  kmail.reply(
    "Tinkered successfully! Enjoy your items!",
    new Map(recipesToAttempt.output.map(({ ingredient, quantity }) => [ingredient, quantity]))
  )
  kmail.delete()
  cliExecute(`use * spooky nuggets`)
  return

}

type Recipe = {
  id: string,
  output: string,
  method: string[],
  inputs: string[],
}
let recipesByIngredient: Map<string, Recipe[]> = new Map()

function processConcoctionLine(line: string) {
  const splitLine = line.split("\t")
  if (splitLine.length < 3) return
  let [output, method, ...inputs] = splitLine
  const recipe = {
    id: line,
    output: output,
    method: method.split(","),
    inputs: inputs
  }

  for (const input of inputs) {
    if (!recipesByIngredient.has(input)) recipesByIngredient.set(input, [])
    recipesByIngredient.set(input, (recipesByIngredient.get(input) as Recipe[]).concat([recipe]))
  }

}

function loadConcoctions() {
  const serialisedRecipes = sessionStorage.getItem("concoctions map")
  if (serialisedRecipes) {
    recipesByIngredient = new Map(JSON.parse(serialisedRecipes))
    return
  }
  let buffer = fileToBuffer("data/concoctions.txt")
  const lines = buffer.split("\n").filter(line => !(`${line}`.startsWith("#") || line.length === 0))
  for (const line of lines) {
    processConcoctionLine(line)
  }
  sessionStorage.setItem("concoctions map", JSON.stringify(Array.from(recipesByIngredient.entries())))
}


export default function main(sender: string, message: string, channel: string): void {
  if (channel == "Events") {
    loadConcoctions();
    const inbox = Kmail.inbox()
    for (let kmail of inbox) {
      processKmail(kmail)
      print("-------------------------------------------------------------------")
    }
  }
  if (86400000 - gametimeToInt() < 180000) {
    waitq(900); // sleep 15 minutes
    cliExecute("login TinkerTailorSolderFry");
  }

}
