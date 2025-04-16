<template>
  <div class="face-recognition">
    <div class="camera">
      <h2>Face Recognition App</h2>
      <video ref="video" autoplay muted width="480" height="480"></video>
      <canvas ref="canvas" width="640" height="480"></canvas>
      <p>{{ resultMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as faceapi from 'face-api.js'

const router = useRouter()
const video = ref(null)
const canvas = ref(null)
const resultMessage = ref('')
const modelsLoaded = ref(false)
const labeledDescriptors = ref([])
let lastMatchedLabel = null
let lastMatchedTime = 0

const loadModels = async () => {
  const MODEL_URL = '/models'
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    modelsLoaded.value = true
  } catch (error) {
    console.error("Modelni yuklashda xatolik:", error)
  }
}

const loadLabeledImages = async () => {
  const labels = ['1']
  try {
    labeledDescriptors.value = await Promise.all(
      labels.map(async (label) => {
        const img = await faceapi.fetchImage(`/labeled_images/${label}.jpg`)
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor()
        if (!detections) return null
        return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor])
      })
    )
  } catch (error) {
    console.error("Rasmni yuklashda xatolik:", error)
  }
}

const startVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    video.value.srcObject = stream
    detectFaces()
  } catch (err) {
    console.error("Kameraga kirish uchun ruxsat berilmadi:", err)
    resultMessage.value = "Kameraga kirish uchun ruxsat berilmadi yoki qurilma topilmadi."
  }
}

const detectFaces = () => {
  if (!modelsLoaded.value || labeledDescriptors.value.length === 0) {
    console.error("Modellar yuklanmagan yoki descriptorlar bo'sh.")
    resultMessage.value = "Modellar yuklanmagan yoki descriptorlar bo'sh."
    return
  }

  const displaySize = { width: video.value.width, height: video.value.height }
  faceapi.matchDimensions(canvas.value, displaySize)

  setInterval(async () => {
    const detection = await faceapi
      .detectSingleFace(video.value, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor()

    const ctx = canvas.value.getContext('2d')
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

    if (detection) {
      const resizedDetections = faceapi.resizeResults(detection, displaySize)
      const faceBox = resizedDetections.detection.box
      const matcher = new faceapi.FaceMatcher(labeledDescriptors.value, 0.6)
      const match = matcher.findBestMatch(detection.descriptor)

      if (match.label === '1') {
        if (lastMatchedLabel !== match.label) {
          lastMatchedLabel = match.label
          lastMatchedTime = Date.now()
          resultMessage.value = `${match.label} topildi!`
          setTimeout(() => {
            router.push('/main')
          }, 3000)
        } else {
          const now = Date.now()
          if (now - lastMatchedTime >= 10000) {
            resultMessage.value = `${match.label} tasdiqlandi!`
            lastMatchedTime = now
          }
        }
      } else if (match.label !== 'unknown') {
        resultMessage.value = 'Uzr, Sizga kirish mumkin emas.'
      } else {
        resultMessage.value = 'Bu odam topilmadi.'
      }

      // Oval chizish
      ctx.beginPath()
      ctx.ellipse(
        faceBox.x + faceBox.width / 2,
        faceBox.y + faceBox.height / 2,
        faceBox.width / 2,
        faceBox.height / 2,
        0,
        0,
        2 * Math.PI
      )
      ctx.strokeStyle = 'blue'
      ctx.lineWidth = 4
      ctx.stroke()

      faceapi.draw.drawDetections(canvas.value, resizedDetections)
      faceapi.draw.drawFaceLandmarks(canvas.value, resizedDetections)
    } else {
      resultMessage.value = 'Yuz aniqlanmadi.'
    }
  }, 1000)
}

onMounted(async () => {
  await loadModels()
  await loadLabeledImages()
  await startVideo()
})
</script>

<style scoped>
.face-recognition {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding: 10px;
}

.camera {
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

video {
  border-radius: 50%;
  border: 2px solid red;
}

canvas {
  position: absolute;
  top: 0;
  bottom: 50%;
  pointer-events: none;
}
</style>
