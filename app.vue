<template>
  <div style="width: 100%; height: 100vh; background-color: blue; color: white; padding: 4px;">
    <h1>Objektlarni aniqlash (ko‘zi ojizlar uchun)</h1>
    <video ref="videoRef" autoplay playsinline muted width="100%" height="480" class="border" />
    <ul v-if="results.length" class="mt-4 space-y-1">
      <li v-for="(r, i) in results" :key="i">
        {{ r.class }} — {{ (r.score * 100).toFixed(2) }}% — Masofa: {{ estimateDistance(r.bbox[3]) }} m
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'

const videoRef = ref(null)
const results = ref([])




// Masofani taxminlash funksiyasi
function estimateDistance(boxHeight) {
  const REAL_OBJECT_HEIGHT = 1.6 // metrda
  const FOCAL_LENGTH = 500 // tajribaviy qiymat
  const distanceInMeters = (REAL_OBJECT_HEIGHT * FOCAL_LENGTH) / boxHeight
  const steps = distanceInMeters / 0.75 // 1 qadam ≈ 0.75 m
  return Math.round(steps) + " qadam"
}


onMounted(async () => {
  await tf.setBackend('webgl')
  await tf.ready()
  console.log('✅ TensorFlow backend:', tf.getBackend())

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment' // orqa kamera
      }
    })
    videoRef.value.srcObject = stream

    // 🎯 KAMERA YUKLANGANINI KUTAMIZ
    await new Promise((resolve) => {
      videoRef.value.onloadeddata = () => {
        console.log('🎥 Kamera tayyor')
        resolve()
      }
    })
  } catch (err) {
    console.error('❌ Kamera ulanmadi:', err)
    return
  }

  const model = await cocoSsd.load()
  console.log('✅ Model yuklandi')

  const detect = async () => {
    if (videoRef.value && model) {
      const predictions = await model.detect(videoRef.value)
      results.value = predictions
    }
    requestAnimationFrame(detect)
  }

  detect()
})


</script>

<style scoped>

*{
  box-sizing: border-box;
}

</style>
