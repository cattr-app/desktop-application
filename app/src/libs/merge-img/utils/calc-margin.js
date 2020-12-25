module.exports = function calcMargin(obj = {}) {

  if (Number.isInteger(obj)) {

    return {
      top: obj,
      right: obj,
      bottom: obj,
      left: obj,
    };

  }

  if (typeof obj === 'string') {

    const [top, right = top, bottom = top, left = right] = obj.split(' ');

    return {
      top: Number(top),
      right: Number(right),
      bottom: Number(bottom),
      left: Number(left),
    };

  }

  const {
    top = 0, right = 0, bottom = 0, left = 0,
  } = obj;

  return {
    top,
    right,
    bottom,
    left,
  };

};
