/**
 * This is a local copy of https://github.com/preco21/merge-img
 */

const isPlainObj = require('is-plain-obj');
const Jimp = require('jimp');
const alignImage = require('./utils/align-image');
const calcMargin = require('./utils/calc-margin');

const { read } = Jimp;

module.exports = function mergeImg(images, {
  direction = false,
  color = 0x00000000,
  align = 'start',
  offset = 0,
  margin,
} = {}) {

  if (!Array.isArray(images))
    throw new TypeError('`images` must be an array that contains images');


  if (images.length < 1)
    throw new Error('At least `images` must contain more than one image');

  const processImg = img => {

    if (img instanceof Jimp)
      return { img };

    if (isPlainObj(img)) {

      const { src, offsetX, offsetY } = img;

      return read(src)
        .then(imgObj => ({
          img: imgObj,
          offsetX,
          offsetY,
        }));

    }

    return read(img).then(imgObj => ({ img: imgObj }));

  };

  return Promise.all(images.map(processImg))
    .then(imgs => {

      let totalX = 0;
      let totalY = 0;

      const imgData = imgs.reduce((res, { img, offsetX = 0, offsetY = 0 }) => {

        const { bitmap: { width, height } } = img;

        res.push({
          img,
          x: totalX + offsetX,
          y: totalY + offsetY,
          offsetX,
          offsetY,
        });

        totalX += width + offsetX;
        totalY += height + offsetY;

        return res;

      }, []);

      const {
        top, right, bottom, left,
      } = calcMargin(margin);
      const marginTopBottom = top + bottom;
      const marginRightLeft = right + left;

      const totalWidth = direction
        ? Math.max(...imgData.map(({ img: { bitmap: { width } }, offsetX }) => width + offsetX))
        : imgData.reduce((res, { img: { bitmap: { width } }, offsetX }, index) => {

          const widthCalculated = res + width + offsetX + (Number(index > 0) * offset);
          return widthCalculated;

        }, 0);

      const totalHeight = direction
        ? imgData.reduce((res, { img: { bitmap: { height } }, offsetY }, index) => {

          const heightCalculated = res + height + offsetY + (Number(index > 0) * offset);
          return heightCalculated;

        }, 0)
        : Math.max(...imgData.map(({ img: { bitmap: { height } }, offsetY }) => height + offsetY));

      const baseImage = new Jimp(totalWidth + marginRightLeft, totalHeight + marginTopBottom, color);

      // Fallback for `Array#entries()`
      const imgDataEntries = imgData.map((data, index) => [index, data]);

      // eslint-disable-next-line no-restricted-syntax
      for (const [index, {
        img, x, y, offsetX, offsetY,
      }] of imgDataEntries) {

        const { bitmap: { width, height } } = img;
        const [px, py] = direction
          ? [alignImage(totalWidth, width, align) + offsetX, y + (index * offset)]
          : [x + (index * offset), alignImage(totalHeight, height, align) + offsetY];

        baseImage.composite(img, px + left, py + top);

      }

      return baseImage;

    });

};
