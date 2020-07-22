export function addLight(color, amount) {

  const cc = parseInt(color, 16) + amount;
  let c = (cc > 255) ? 255 : (cc);
  c = (c.toString(16).length > 1) ? c.toString(16) : `0${c.toString(16)}`;
  return c;

}

export function lighten(rawColor, rawAmount) {

  const color = (rawColor.includes('#')) ? rawColor.substring(1, rawColor.length) : rawColor;
  const amount = parseInt((255 * rawAmount) / 100, 10);
  return `#${addLight(color.substring(0, 2), amount)}${addLight(color.substring(2, 4), amount)}${addLight(color.substring(4, 6), amount)}`;

}

export function subtractLight(color, amount) {

  const cc = parseInt(color, 16) - amount;
  let c = (cc < 0) ? 0 : (cc);
  c = (c.toString(16).length > 1) ? c.toString(16) : `0${c.toString(16)}`;
  return c;

}

export function darken(rawColor, rawAmount) {

  const color = (rawColor.includes('#')) ? rawColor.substring(1, rawColor.length) : rawColor;
  const amount = parseInt((255 * rawAmount) / 100, 10);
  return `#${subtractLight(color.substring(0, 2), amount)}${subtractLight(color.substring(2, 4), amount)}${subtractLight(color.substring(4, 6), amount)}`;

}
