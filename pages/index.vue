<template>
  <div>
    <video ref="videoRef" autoplay playsinline muted class="w-full h-[600px]" />
    <ul v-if="results.length" class="mt-4 space-y-1">
      <li v-for="(r, i) in results" :key="i">
        {{ translateLabel(r.class) }} — {{ (r.score * 100).toFixed(2) }}% — {{ estimateDistance(r.bbox[3]) }}
      </li>
      <li>{{ videotext }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import Tesseract from 'tesseract.js'

const videoRef = ref(null)
const results = ref([])
let isSpeaking = false
let previousSpoken = ''
let model = null
let videotext = null

const uzbekLabels = {
  person: "odam",
  bicycle: "velosiped",
  car: "mashina",
  motorcycle: "mototsikl",
  airplane: "samolyot",
  bus: "avtobus",
  train: "poyezd",
  truck: "yuk mashinasi",
  boat: "qayiq",
  bird: "qush",
  cat: "mushuk",
  dog: "it",
  horse: "ot",
  sheep: "qo‘y",
  cow: "sigir",
  bottle: "shisha",
  chair: "stul",
  backpack: "ryukzak",
  tv: "televizor",
  laptop: "noutbuk",
  book: "kitob",
  cellphone: "telefon"
}

function translateLabel(label) {
  return uzbekLabels[label] || label
}

function estimateDistance(boxHeight) {
  const OBJECT_REAL_HEIGHT = 1.6
  const IMAGE_HEIGHT_IN_PIXELS = 480
  const CAMERA_VERTICAL_FOV = Math.PI / 3
  const focalLength = IMAGE_HEIGHT_IN_PIXELS / (2 * Math.tan(CAMERA_VERTICAL_FOV / 2))
  let distanceMeters = (OBJECT_REAL_HEIGHT * focalLength) / boxHeight
  const calibrationFactor = 0.33
  distanceMeters *= calibrationFactor

  const stepLength = 0.75
  const steps = distanceMeters / stepLength

  const distanceText = distanceMeters.toFixed(2) + " metr"
  const stepsText = steps < 1 ? "0.5-1 qadam" : Math.round(steps) + " qadam"

  return `gacha: ${distanceText}`
}

async function speak(text) {
  if (isSpeaking) return
  isSpeaking = true

  const token = 'f9q208KY3hraE64wU2rHHz0FtzhAk7K6XFCmMMLD'
  const speaker_id = 1

  const formData = new URLSearchParams()
  formData.append('token', token)
  formData.append('text', text)
  formData.append('speaker_id', speaker_id)

  try {
    const response = await fetch('https://api.muxlisa.uz/v1/api/services/tts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData,
    })

    if (!response.ok) {
      console.error('❌ Audio olishda xatolik:', response.statusText)
      isSpeaking = false
      return
    }

    const blob = await response.blob()
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)

    await new Promise((resolve) => {
      audio.onended = () => {
        isSpeaking = false
        resolve()
      }
      audio.onerror = () => {
        isSpeaking = false
        resolve()
      }
      audio.play()
    })

  } catch (err) {
    console.error('❌ TTS xatosi:', err)
    isSpeaking = false
  }
}

async function detectTextFromRegion(videoEl, bbox) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  const [x, y, width, height] = bbox
  canvas.width = width
  canvas.height = height

  context.drawImage(videoEl, x, y, width, height, 0, 0, width, height)

  // OCR uchun rasmni yaxshilash
  context.filter = 'contrast(150%) brightness(120%)';  // Rasmni yaxshilash
  context.drawImage(videoEl, x, y, width, height, 0, 0, width, height)

  // Debug: Kesilgan rasmni ko‘rsatish
  const previewImg = canvas.toDataURL()
  console.log("📸 OCR rasm preview:", previewImg)

  try {
    const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
      logger: m => console.log('📚 OCR jarayoni:', m)
    })
    console.log("📝 OCR natijasi:", text)
    videotext = text;
    return text.trim()
  } catch (err) {
    console.error('❌ OCR xatosi:', err)
    return ''
  }
}

async function detectLoop() {
  while (true) {
    if (videoRef.value && model) {
      const predictions = await model.detect(videoRef.value)
      results.value = predictions

      if (predictions.length) {
        const first = predictions[0]
        const label = translateLabel(first.class)
        const distance = estimateDistance(first.bbox[3])

        let extraText = ''
        if (first.class === 'bottle') {
          const textOnBottle = await detectTextFromRegion(videoRef.value, first.bbox)
          extraText = textOnBottle
            ? `, ustidagi yozuv: ${textOnBottle}`
            : ', ustida yozuv topilmadi'
        }

        const spoken = `${label}, ${distance}${extraText}`

        if (spoken !== previousSpoken) {
          previousSpoken = spoken
          await speak(spoken)
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

onMounted(async () => {
  await tf.setBackend('webgl')
  await tf.ready()
  console.log('✅ TensorFlow backend:', tf.getBackend())

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    videoRef.value.srcObject = stream

    await new Promise(resolve => {
      videoRef.value.onloadeddata = () => {
        console.log('🎥 Kamera tayyor')
        resolve()
      }
    })
  } catch (err) {
    console.error('❌ Kamera ulanmadi:', err)
    return
  }

  model = await cocoSsd.load()
  console.log('✅ Model yuklandi')

  detectLoop()
})
</script>
