const axios = require('axios'); //you can use any http client
const tf = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');
async function fn() {
  const pic = await axios.get(`https://pbs.twimg.com/media/ErnjqNiUcAIouXL.jpg`, {
    responseType: 'arraybuffer',
  });
  const model = await nsfw.load('https://ml.files-sashido.cloud/models/nsfw_mobilenet_v2/93/'); // To load a local model, nsfw.load('file://./path/to/model/')
  // Image must be in tf.tensor3d format
  // you can convert image to tf.tensor3d with tf.node.decodeImage(Uint8Array,channels)
  const image = await tf.node.decodeImage(pic.data, 3);
  const predictions = await model.classify(image);
  image.dispose(); // Tensor memory must be managed explicitly (it is not sufficient to let a tf.Tensor go out of scope for its memory to be released).
  console.log(predictions);
}
fn();
