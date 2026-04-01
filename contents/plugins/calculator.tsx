import { Calculator } from "lucide-react";
import type { PalettePlugin, PluginItem } from "./types";

// Native recursive descent parser for basic math to avoid 'eval' CSP issues in Chrome Extensions.
function parseMath(str: string): number {
  const tokens = str.match(/(?:(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?)|[+\-*/()]/g);
  if (!tokens) throw new Error("Invalid expression");

  let pos = 0;

  function parseFactor(): number {
    if (pos >= tokens!.length) throw new Error("Unexpected end");
    const token = tokens![pos++];

    if (token === "(") {
      const value = parseExpression();
      if (tokens![pos++] !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    
    if (token === "+" || token === "-") {
      const value = parseFactor();
      return token === "-" ? -value : value;
    }

    const value = parseFloat(token);
    if (isNaN(value)) throw new Error("Invalid number: " + token);
    return value;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens!.length && (tokens![pos] === "*" || tokens![pos] === "/")) {
      const op = tokens![pos++];
      const right = parseFactor();
      if (op === "*") left *= right;
      else left /= right;
    }
    return left;
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (pos < tokens!.length && (tokens![pos] === "+" || tokens![pos] === "-")) {
      const op = tokens![pos++];
      const right = parseTerm();
      if (op === "+") left += right;
      else left -= right;
    }
    return left;
  }

  const result = parseExpression();
  if (pos < tokens.length) throw new Error("Unexpected tokens at end");
  return result;
}


export const CalculatorPlugin: PalettePlugin = {
  id: "calculator",
  name: "Calculator",
  
  match(query: string) {
    if (!query.trim()) return false;
    // Match only if it looks like a math expression (numbers, operators, spaces) 
    // At least one operator must be present to distinguish from plain numbers
    return /^[\d\s()+\-*/.]+$/.test(query) && /[+\-*/()]/.test(query);
  },

  getResults(query: string): PluginItem[] {
    try {
      const result = parseMath(query);
      if (isNaN(result) || !isFinite(result)) return [];

      const resultStr = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(6)).toString();

      return [
        {
          id: `calc-${resultStr}`,
          title: resultStr,
          subtitle: `Result of: ${query}`,
          icon: <Calculator className="w-4 h-4 opacity-70" />,
          copyValue: resultStr
        }
      ];
    } catch (err) {
      return [];
    }
  }
};
