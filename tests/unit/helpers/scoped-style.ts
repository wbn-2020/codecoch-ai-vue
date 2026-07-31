/**
 * Removes one SCSS/CSS selector block using balanced braces.
 * Static style contracts can then exempt an explicit migration scope while
 * continuing to validate every legacy rule in the same source file.
 */
export function stripScopedStyleBlock(source: string, selector: string): string {
  let result = source
  while (true) {
    const selectorStart = result.indexOf(`${selector} {`)
    if (selectorStart < 0) return result

    const blockStart = selectorStart + selector.length
    let depth = 0
    let blockEnd = -1
    for (let index = blockStart; index < result.length; index += 1) {
      const character = result[index]
      if (character === '{') depth += 1
      if (character !== '}') continue
      depth -= 1
      if (depth === 0) {
        blockEnd = index
        break
      }
    }

    if (blockEnd < 0) return result
    result = `${result.slice(0, selectorStart)}${result.slice(blockEnd + 1)}`
  }
}
