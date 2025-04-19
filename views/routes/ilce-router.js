const express = require('express');
const router = express.Router();

// Bursa'nın tüm ilçeleri
const BURSA_ILCELER = [
  'osmangazi', 'nilufer', 'yildirim', 'gemlik', 'inegol',
  'mudanya', 'kestel', 'orhangazi', 'mustafakemalpasa',
  'gursu', 'karacabey', 'orhaneli', 'keles', 'buyukorhan',
  'harmancik', 'iznik', 'yenisehir'
];

// Bursa'nın tüm mahalleleri (ilçe bazında)
const MAHALLELER = {
  osmangazi: ['altiparmak', 'cekirge', 'demirtas', 'emek', 'hamitler', 'hocaalizade', 'kukurtlu', 'soganli', 'yunuseli'],
  nilufer: ['ataevler', 'ozluce', 'besevler', 'camlica', 'fethiye', 'gorukle', 'ihsaniye', 'konak', 'ucevler'],
  yildirim: ['anadolu', 'degirmenonu', 'erikli', 'hacivat', 'karaagac', 'millet', 'teleferik', 'yesilyayla'],
  gemlik: ['adliye', 'buyukkumla', 'cihatli', 'kursunlu', 'umurbey'],
  inegol: ['alanyurt', 'burhaniye', 'cerrah', 'mahmudiye', 'yenice'],
  mudanya: ['burgaz', 'egitim', 'guzelyali', 'halitpasa', 'kumyaka', 'tirilye'],
  kestel: ['ahmetvefikpasa', 'barakfakih', 'gözede', 'sevketiye', 'umitalan'],
  orhangazi: ['arapzade', 'cakirli', 'gedelek', 'hurriyet', 'muradiye', 'tekke', 'yenikoy'],
  mustafakemalpasa: ['adalet', 'hamidiye', 'lalasahin', 'yalintas', 'yunusemre'],
  gursu: ['adakoy', 'diskaya', 'kurtulus', 'yenidogan'],
  karacabey: ['canbali', 'drama', 'saadet', 'tabaklar', 'yenikoy'],
  orhaneli: ['akcabuk', 'fadil', 'gazioluk', 'karincali', 'sogut'],
  keles: ['barakli', 'belenoren', 'duvenli', 'kiranisiklar', 'kocayayla'],
  buyukorhan: ['aktas', 'balikoy', 'cakiryer', 'danacilar', 'gedikler'],
  harmancik: ['cakmak', 'gulozu', 'ishaklar', 'okcular', 'yayabasi'],
  iznik: ['boyalica', 'cakirca', 'esrefzade', 'selcuk', 'yenimahalle'],
  yenisehir: ['barcin', 'cayir', 'kurtulus', 'kozdere', 'yoloren']
};

// SEO dostu URL'ler için küçük harf ve Türkçe karakter düzeltme
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ /g, '-');
}

// İlçe ve mahalle yönlendirme middleware'i
router.get('/:ilce/:mahalle?', (req, res, next) => {
  try {
    const ilce = normalizeText(req.params.ilce);
    const mahalle = req.params.mahalle ? normalizeText(req.params.mahalle) : null;

    // 1. İlçe geçerli mi kontrolü
    if (!BURSA_ILCELER.includes(ilce)) {
      return res.status(404).render('404', { 
        message: 'İstediğiniz ilçe bulunamadı',
        redirectUrl: '/'
      });
    }

    // 2. Mahalle parametresi yoksa ilçe sayfasını göster
    if (!mahalle) {
      return renderIlceSayfasi(res, ilce);
    }

    // 3. Mahalle geçerli mi kontrolü
    const ilceMahalleleri = MAHALLELER[ilce] || [];
    if (!ilceMahalleleri.includes(mahalle)) {
      return res.redirect(301, `/${ilce}`);
    }

    // 4. Geçerli mahalle ise mahalle sayfasını göster
    renderMahalleSayfasi(res, ilce, mahalle);

  } catch (error) {
    console.error('Yönlendirme hatası:', error);
    next(error);
  }
});

// İlçe sayfası render fonksiyonu
function renderIlceSayfasi(res, ilce) {
  const ilceData = {
    title: `${ilce.toUpperCase()} Escort - Bursa`,
    ilceAdi: ilce.toUpperCase(),
    mahalleler: MAHALLELER[ilce] || []
  };
  res.render('ilce-sayfasi', ilceData);
}

// Mahalle sayfası render fonksiyonu
function renderMahalleSayfasi(res, ilce, mahalle) {
  const mahalleData = {
    title: `${ilce.toUpperCase()} ${mahalle.toUpperCase()} Escort`,
    ilceAdi: ilce.toUpperCase(),
    mahalleAdi: mahalle.toUpperCase(),
    ilceUrl: `/${ilce}`
  };
  res.render('mahalle-sayfasi', mahalleData);
}

module.exports = router;