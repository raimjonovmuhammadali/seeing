<template>
    <div class="flex flex-col items-center justify-between bg-[#071c39] min-h-screen py-4 px-2">
      <div class="relative w-full max-w-4xl mb-3 flex items-center justify-center">
        <video ref="videoRef" autoplay playsinline muted class="w-[99%] sm:w-[375px] h-[500px] object-cover rounded-xl shadow-lg border-2 border-gray-300 fixed top-0 z-10" />
      </div>
  
      <div v-if="results.length" class="w-full max-w-4xl bg-gray-100 p-3 mt-[620px] rounded-md">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Aniqlangan buyum</h2>
        <ul class="bg-white rounded-lg shadow-md p-4 space-y-3">
          <li v-for="(r, i) in results" :key="i" class="flex items-center justify-between text-gray-700 border-b border-gray-200 pb-2">
            <span class="font-medium">{{ translateLabel(r.class) }}</span>
            <span class="text-sm text-gray-500">{{ (r.score * 100).toFixed(2) }}% — {{ estimateDistance(r.bbox[3], r.class) }}</span>
          </li>
        </ul>
      </div>
  
      <div v-if="!model" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
        <div class="loader">Loading...</div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import * as cocoSsd from '@tensorflow-models/coco-ssd'
  import * as tf from '@tensorflow/tfjs'
  import '@tensorflow/tfjs-backend-webgl'
  
  const videoRef = ref(null)
  const results = ref([])
  let isSpeaking = false
  let previousSpoken = ''
  let model = null
  
  const uzbekLabels = {
    person: "odam",
    bottle: "shisha",
    chair: "stul",
    laptop: "noutbuk",
    book: "kitob",
    'cell phone': "telefon",
    apple: "olma",
    backpack: "ryukzak",
    banana: "banan",
    bed: "kreslo",
    bench: "skameyka",
    book: "kitob",
    bottle: "idish",
    bus: "avtobus",
    cake: "pishiriq",
    car: "avtomobil",
    cat: "mushuk",
    couch: "divan",
    'dining table': "ovqat stoli",
    dog: "it",
    don: "dona",
    'fire hydrant': "yong'in xavfsizligi",
    fork: "vilkalar",
    frisbee: "frisbi",
    giraffe: "jirafa",
    'hair drier': "soch quritgich",
    handkerchief: "ro‘mol",
    'hot dog': "hot dog",
    keyboard: "klaviatura",
    kite: "koshin",
    knife: "pichoq",
    laptop: "noutbuk",
    microwave: "mikroto‘lqinli pech",
    mouse: "sichqoncha",
    orange: "apelsin",
    oven: "pech",
    'parking meter': "avtomobil o‘lchovchi",
    pencil: "qarashtirish",
    person: "odam",
    pizza: "pitsa",
    plant: "o‘simlik",
    plate: "loy",
    pool: "basseyn",
    rabbit: "quyon",
    remote: "masofadan boshqarish",
    scissors: "qaychi",
    skateboard: "skeytbord",
    'stop sign': "to‘xtash belgi",
    suitcase: "chemodan",
    'teddy bear': "oliq",
    toothbrush: "tish tozalagich",
    'traffic light': "trafik chirog‘i",
    truck: "yuk mashinasi",
    umbrella: "paypoq",
    vase: "vaza",
    'wine glass': "sharob stakan",
    zebra: "zebra",
    bird: "qush"
  };
  
  
  const objectHeights = {
    person: 1.6,      // metr
    bottle: 0.25,
    chair: 1.0,
    laptop: 0.03,
    book: 0.25,
    cellphone: 0.15,
    // Standart qiymat qo‘shiladi agar yo‘q bo‘lsa
  }
  
  function translateLabel(label) {
    return uzbekLabels[label] || label
  }
  
  function estimateDistance(boxHeight, label) {
    const IMAGE_HEIGHT = 500
    const CAMERA_FOV = Math.PI / 3
    const focalLength = IMAGE_HEIGHT / (2 * Math.tan(CAMERA_FOV / 2))
  
    const realHeight = objectHeights[label] || 0.5
    let distance = (realHeight * focalLength) / boxHeight
    distance *= 0.33 // Kalibratsiya
  
    const meters = Math.floor(distance)
    const centimeters = Math.round((distance - meters) * 100)
  
    // Agar masofa 0 metr bo'lsa, faqat santimetrni ko'rsating
    if (meters === 0) {
      return `${centimeters} santimetr`
    }
  
    return `${meters}metr ${centimeters} santimetr`
  }
  
  
  async function speak(text) {
    if (isSpeaking) return
    isSpeaking = true
  
    const token = 'iTUJ1VyCU8Vp8eEtdjiNdfa4WNO_EsmiOM79BkJy'
    const speaker_id = 1
  
    const formData = new URLSearchParams()
    formData.append('token', token)
    formData.append('text', text)
    formData.append('speaker_id', speaker_id)
  
    try {
      const response = await fetch('https://api.muxlisa.uz/v1/api/services/tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      })
  
      // Agar server xatolik bergan bo'lsa, uni tekshiring
      if (!response.ok) {
        console.error('API xatosi:', response.statusText)
        throw new Error('API xatosi')
      }
  
      const blob = await response.blob()
  
      // Agar audio yuklab olishda xato bo'lsa, xatolikni chiqarish
      if (!blob) {
        console.error('Audio yuklab olishda xato')
        throw new Error('Audio yuklab olishda xato')
      }
  
      const audio = new Audio(URL.createObjectURL(blob))
  
      // Audio o‘ynash
      await new Promise(resolve => {
        audio.onended = () => { isSpeaking = false; resolve() }
        audio.onerror = (err) => { 
          console.error('Audio o‘ynashda xato:', err) 
          isSpeaking = false; resolve() 
        }
        audio.play().catch(err => {
          console.error('Audio o‘ynashda xato:', err)
          isSpeaking = false
        })
      })
    } catch (err) {
      console.error('TTS xatosi:', err)
      isSpeaking = false
    }
  }
  
  async function detectLoop() {
    let lastDetectionTime = 0
  
    async function detect() {
      const now = Date.now()
      if (now - lastDetectionTime > 1000 && videoRef.value && model) {
        const predictions = await model.detect(videoRef.value)
        results.value = predictions
  
        if (predictions.length) {
          const first = predictions[0]
          const labelUz = translateLabel(first.class)
          const distance = estimateDistance(first.bbox[3], first.class)
  
          // Agar masofa null bo'lsa, gapirmaslik
          if (distance) {
            const spoken = `${labelUz} gacha, ${distance}`
  
            if (spoken !== previousSpoken) {
              previousSpoken = spoken
              await speak(spoken)
            }
          }
        }
  
        lastDetectionTime = now
      }
  
      requestAnimationFrame(detect)
    }
  
    detect()
  }
  
  onMounted(async () => {
    await tf.setBackend('webgl')
    await tf.ready()
  
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    })
    videoRef.value.srcObject = stream
  
    await new Promise(resolve => {
      videoRef.value.onloadeddata = () => resolve()
    })
  
    model = await cocoSsd.load()
    detectLoop()
  })
  </script>
  
  <style scoped>
  .loader {
    border: 4px solid #f3f3f3; /* Light grey */
    border-top: 4px solid #3498db; /* Blue */
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  </style>
  