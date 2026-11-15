<script setup lang="ts">
useHead({ title: 'Gizlilik politikası · Kelimo' });
</script>

<template>
  <main class="section">
    <div class="container is-max-desktop">
      <NuxtLink to="/"><img src="/logo.svg" alt="Kelimo" style="height: 40px" class="mb-5" /></NuxtLink>

      <article class="ink-box p-6 content">
        <h1 class="display">Gizlilik politikası</h1>
        <p class="has-text-muted">Son güncelleme: 15 Kasım 2026</p>

        <p>
          Kelimo, YouTube altyazısındaki kelimelerin anlamını gösteren ve kaydettiğin kelimeleri bir listede toplayan açık kaynaklı, ticari olmayan bir eğitim
          projesidir. Bu sayfa, hangi verileri topladığımızı ve nasıl kullandığımızı anlatır.
        </p>

        <h2 class="display">Topladığımız veriler</h2>
        <ul>
          <li><strong>E-posta adresi ve şifre:</strong> Hesabını oluşturmak ve giriş yapmak için. Şifre düz metin olarak saklanmaz, tek yönlü bir özetleme (PBKDF2) ile saklanır.</li>
          <li><strong>Ana dil seçimi:</strong> Çeviri yönünü (İngilizce→Türkçe veya Türkçe→İngilizce) belirlemek için.</li>
          <li><strong>Kaydettiğin kelimeler ve anlamları:</strong> Kelime listeni göstermek için.</li>
          <li><strong>Oturum anahtarı:</strong> Giriş yaptıktan sonra seni tanımak için tarayıcında (panelde ve eklentide) saklanır. Çıkış yapınca silinir.</li>
        </ul>

        <h2 class="display">Çeviri sırasında paylaşılan veri</h2>
        <p>
          Bir kelimenin üzerine geldiğinde, o kelime ve içinde geçtiği altyazı cümlesi çeviri için Microsoft Azure Translator hizmetine gönderilir. Doğru anlamı
          seçebilmek için cümle de gönderilir. Başka bir sayfa içeriği, tarama geçmişi veya videonun diğer bölümleri gönderilmez ya da okunmaz. Aynı kelime ve
          cümle için yapılan çeviriler hızlı olması için sunucuda saklanır.
        </p>

        <h2 class="display">Eklentinin izinleri</h2>
        <ul>
          <li><strong>youtube.com:</strong> Altyazıdaki kelimeyi algılamak ve anlamını göstermek için.</li>
          <li><strong>kelimo.net:</strong> Hesabına bağlanmak ve kelimeleri kaydetmek için.</li>
          <li><strong>Sağ tık menüsü, depolama, etkin sekme:</strong> Seçtiğin kelimeyi kaydetmek ve oturum anahtarını tutmak için.</li>
        </ul>

        <h2 class="display">Paylaşmadığımız şeyler</h2>
        <p>
          Verilerini satmayız, reklam göstermeyiz, analiz ya da izleme araçları kullanmayız. Verilerin yalnızca hizmeti sunmak için kullanılır. Yukarıda anlatılan
          çeviri isteği dışında üçüncü taraflarla paylaşılmaz.
        </p>

        <h2 class="display">Verilerin nerede tutulur</h2>
        <p>Hesap ve kelime verilerin Cloudflare altyapısında (Cloudflare Pages ve D1 veritabanı) tutulur.</p>

        <h2 class="display">Verilerini silme</h2>
        <p>
          Kelime listeni gördüğün sayfanın üstündeki <strong>Hesabı sil</strong> düğmesiyle hesabını, kaydettiğin tüm kelimeleri ve oturum anahtarlarını kalıcı olarak
          silebilirsin. Bu işlem geri alınamaz. Çeviri önbelleği hesabınla ilişkilendirilmediği için kişisel veri içermez.
        </p>

        <h2 class="display">Değişiklikler</h2>
        <p>Bu politika değişirse bu sayfa güncellenir ve üstteki tarih değişir.</p>
      </article>
    </div>
  </main>
</template>
