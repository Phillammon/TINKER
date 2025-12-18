import {
  print,
  craft, use, fileToBuffer, Item, sessionStorage
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
function processKmail(kmail: Kmail) {

  print("+-------------------------------------------------------------------")
  print(`| Started processing kmail from ${kmail.senderName}`)
  const items: Map<Item, number> = kmail.items();
  const spookies: number = items.has($item`spooky nuggets`) ? items.get($item`spooky nuggets`) as number : 0;
  const ingredients = Array.from(items.entries())
    .filter(([item, _quantity]) => !$items`spooky nuggets`.includes(item))


  print(`| Recieved ${spookies} handful${spookies !== 1 ? "s" : ""} of spooky nuggets`)
  print(`| Ingredients:`)
  if (!ingredients.length) print("|  - None found")
  ingredients.map(([item, quantity]) => print(`|  - ${item.name} x ${quantity}`))

  if (ingredients.length !== 2) {
    print("| Recieved wrong quantity of ingredients, aborting.")
    returnItems(kmail, "I currently only know how to handle two-ingredient recipes. Here are your items back.");
    return;
  }


  const plausibleRecipes: Recipe[] = []
  for (const [ingredient, quantity] of ingredients) {
    const recipesForIngredient = recipesByIngredient.get(ingredient.name) || []
  }

  print("| Plausible recipes: ")
  if (!plausibleRecipes.length) print("|  - None found")
  for (const recipe of plausibleRecipes) {
    print(`|  - Make ${recipe.output} via ${JSON.stringify(recipe.method)}`)
    print(`|    Requires: `)
    recipe.inputs.map(item => print(`|    - ${item}`))
  }


  returnItems(kmail, "Thank you for helping test TinkerTailorSolderFry!")

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
    }
  }

}
