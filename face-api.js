import * as faceapi from 'face-api.js'

const labeledDescriptors = ref([])

async function loadFaceModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
}

async function loadLabeledImages() {
  const labels = ['Akmal', 'Opa', 'Ukam'] // oila a’zolarining ismlari
  const descriptors = []

  for (const label of labels) {
    const img = await faceapi.fetchImage(`/faces/${label.toLowerCase()}.jpg`)
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()

    if (detection) {
      descriptors.push(new faceapi.LabeledFaceDescriptors(label, [detection.descriptor]))
    }
  }

  labeledDescriptors.value = descriptors
}

let faceMatcher = null

async function recognizeFace(videoEl) {
  const detection = await faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()

  if (detection && faceMatcher) {
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor)
    return bestMatch.label !== 'unknown' ? bestMatch.label : null
  }

  return null
}
