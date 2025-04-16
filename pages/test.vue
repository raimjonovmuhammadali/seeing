<template>
    <div>
      <video ref="videoRef" autoplay playsinline muted class="w-full h-[600px]" />
      <div v-if="recognizedText" class="mt-4 text-xl">
        Yozuv: {{ recognizedText }}
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import Tesseract from 'tesseract.js';
  
  const videoRef = ref(null);
  const recognizedText = ref('');
  
  let isSpeaking = false;
  let previousText = '';
  
  // Video oqimiga ruxsat olish va rasmni olish uchun
  async function startVideoStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.value.srcObject = stream;
    } catch (err) {
      console.error('❌ Kamera ulanmadi:', err);
    }
  }
  
  // OCR yordamida video oqimidan matnni tanish
  async function recognizeTextFromVideo() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const video = videoRef.value;
  
    // Kamera o'lchamlarini o'lchash
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  
    // Video rasmni canvasga chizish
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
    try {
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
        logger: (m) => console.log(m),
      });
      recognizedText.value = text.trim();
      // Agar matn o'zgargan bo'lsa, ovozli tarzda aytish
      if (recognizedText.value !== previousText) {
        previousText = recognizedText.value;
        await speakText(recognizedText.value);
      }
    } catch (err) {
      console.error('❌ OCR xatosi:', err);
    }
  }
  
  // Matnni ovozga aylantirish
  async function speakText(text) {
    if (isSpeaking) return;
    isSpeaking = true;
  
    // Text-to-Speech API yoki boshqa ovozli tizim
    const token = 'f9q208KY3hraE64wU2rHHz0FtzhAk7K6XFCmMMLD';
    const speaker_id = 1;
    const formData = new URLSearchParams();
    formData.append('token', token);
    formData.append('text', text);
    formData.append('speaker_id', speaker_id);
  
    try {
      const response = await fetch('https://api.muxlisa.uz/v1/api/services/tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
  
      if (!response.ok) {
        console.error('❌ Audio olishda xatolik:', response.statusText);
        isSpeaking = false;
        return;
      }
  
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
  
      await new Promise((resolve) => {
        audio.onended = () => {
          isSpeaking = false;
          resolve();
        };
        audio.onerror = () => {
          isSpeaking = false;
          resolve();
        };
        audio.play();
      });
    } catch (err) {
      console.error('❌ TTS xatosi:', err);
      isSpeaking = false;
    }
  }
  
  // Video oqimidan matnni uzluksiz tahlil qilish
  onMounted(async () => {
    await startVideoStream();
  
    // Rasmni har 3 soniyada tahlil qilish
    setInterval(() => {
      recognizeTextFromVideo();
    }, 3000); // 3 sekundda bir marta OCR tahlilini bajarish
  });
  </script>
  