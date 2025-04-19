require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs").promises;

const app = express();

// Middleware ayarları
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_strong_secret_key_here_123!",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Static dosya sunucusu
app.use(
  "/img",
  express.static(path.join(__dirname, "views", "img"), {
    fallthrough: true,
  })
);

// EJS ayarları
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// JSON dosyası ayarları
const dbPath = path.join(__dirname, "data", "database.json");

// JSON dosyasını okuma
async function readDB() {
  try {
    const data = await fs.readFile(dbPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Dosya okuma hatası:", error);
    return { admins: [], districts: {} };
  }
}

// JSON dosyasına yazma
async function writeDB(data) {
  try {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Dosya yazma hatası:", error);
  }
}

// SHA512 şifreleme fonksiyonu
function sha512(password) {
  return crypto.createHash("sha512").update(password).digest("hex");
}

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/jordi");
}

// Multer ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "views", "img"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file || !file.originalname) {
      return cb(new Error("Dosya adı eksik veya geçersiz"));
    }
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Sadece JPEG veya PNG dosyaları yüklenebilir"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Login işlemi
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("admin-login", {
      error: "Kullanıcı adı ve şifre gereklidir",
    });
  }

  const hashedPassword = sha512(password);
  const db = await readDB();
  const admin = db.admins.find(
    (a) => a.username === username && a.password === hashedPassword
  );

  if (admin) {
    req.session.user = {
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
    };

    // Son giriş zamanını güncelle
    admin.last_login = new Date().toISOString();
    await writeDB(db);

    res.redirect("/admin-index");
  } else {
    res.render("admin-login", {
      error: "Kullanıcı adı veya şifre hatalı",
    });
  }
});

// Logout işlemi
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout hatası:", err);
      return res.status(500).render("error", {
        message: "Çıkış yapılamadı",
      });
    }
    res.redirect("/jordi");
  });
});

// Admin paneli ana sayfası
app.get("/admin-index", requireAuth, (req, res) => {
  res.render("admin-index", {
    user: req.session.user,
    success: req.query.success || null,
    error: req.query.error || null,
  });
});

// Admin giriş sayfası
app.get("/jordi", (req, res) => {
  if (req.session.user) {
    return res.redirect("/admin-index");
  }
  res.render("admin-login", { error: null });
});

// Basit route'lar için fonksiyon
const createSimpleRoute = (routeName) => {
  app.get(`/${routeName}`, (req, res) => {
    res.render(routeName, { error: null });
  });
};

// Tüm basit sayfalar
const simplePages = [
  "lumila", "bahar", "leyla", "burcu", "gozde", "ilayda", "fatma",
  "hatice", "derya", "hilal", "beste", "suzan", "cansu", "eda",
  "yaren", "sude", "aybuke", "ezgi", "damla", "melek", "havin",
  "serenay", "kubra", "esra", "elif", "zeynep", "asel", "asya",
  "defne", "nehir", "azra", "zumra", "eylul", "ecrin", "meryem",
  "lina", "eslem", "masal", "ebrar", "elisa", "ela", "alya",
  "zehra", "miray", "duru", "hiranur", "buglem", "ada", "yagmur",
  "esila", "ikra", "oyku", "gokce", "aleda", "pamira", "lema", "lila",
];

simplePages.forEach((page) => createSimpleRoute(page));

// Tüm ilçeler
const districts = [
  "buyukorhan", "gemlik", "gursu", "harmancik", "inegol", "iznik", "karacabey",
  "keles", "kestel", "mudanya", "mustafakemalpasa", "nilufer", "orhaneli",
  "orhangazi", "osmangazi", "yenisehir", "yildirim",
];

// İlçe listesi route'u oluşturma
const createDistrictListRoute = (districtName) => {
  app.get(`/${districtName}`, async (req, res) => {
    const db = await readDB();
    const districtData = db.districts[districtName] || [];

    const maxSlots = 50;
    const districtsList = [];
    const defaultImage = "/img/default.jpg";

    for (let i = 1; i <= maxSlots; i++) {
      const district = districtData.find((row) => row.sayfa_sira_no === i);
      if (district) {
        districtsList.push({
          name: district.baslik,
          number: district.telefon_no,
          img: district.kapak_resim || defaultImage,
          age: district.yas,
          order: district.sayfa_sira_no,
          isFilled: true,
        });
      } else {
        districtsList.push({
          name: "Sende İlan Ver",
          number: null,
          img: defaultImage,
          age: null,
          order: i,
          isFilled: false,
        });
      }
    }

    res.render(districtName, {
      districts: districtsList,
      currentDistrict: districtName,
      error: null,
    });
  });
};

// İlçe detay route'u oluşturma
const createDistrictDetailRoute = (districtName) => {
  app.get(`/${districtName}/:id`, async (req, res) => {
    const id = parseInt(req.params.id);
    const db = await readDB();
    const districtData = db.districts[districtName] || [];
    const defaultImage = "/img/default.jpg";

    const district = districtData.find((row) => row.sayfa_sira_no === id);
    let districtDetail;

    if (district) {
      const normalImages = district.normal_resimler
        ? district.normal_resimler.split(",")
        : [];
      const images = [district.kapak_resim, ...normalImages].filter((img) => img);
      districtDetail = {
        name: district.baslik,
        number: district.telefon_no,
        images: images.length > 0 ? images : [defaultImage],
        address: district.adres || "Belirtilmemiş",
        description: district.aciklama || "Açıklama yok",
        age: district.yas || "N/A",
        order: district.sayfa_sira_no,
        ilce_adi: district.ilce_adi || districtName,
        isFilled: true,
      };
    } else {
      districtDetail = {
        name: "Bu Sıra Numarasında İlan Yok",
        number: null,
        images: [defaultImage],
        address: null,
        description: "Bu ilçede bu sıraya ait bir ilan bulunamadı.",
        age: null,
        order: id,
        ilce_adi: districtName,
        isFilled: false,
      };
    }

    // Rastgele öneriler
    const suggestions = districtData
      .filter((row) => row.sayfa_sira_no !== id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
      .map((row) => ({
        name: row.baslik,
        number: row.telefon_no,
        img: row.kapak_resim || defaultImage,
        age: row.yas,
        order: row.sayfa_sira_no,
        isFilled: true,
      }));

    res.render("district-detail", {
      district: districtDetail,
      suggestions,
      currentDistrict: districtName,
      error: null,
    });
  });
};

districts.forEach((district) => {
  createDistrictListRoute(district);
  createDistrictDetailRoute(district);
});

// Ana sayfa
app.get("/", (req, res) => {
  res.render("index", { error: null });
});
app.get("/sitemap", (req, res) => {
  res.render("sitemap", { error: null });
});


// Admin paneli için ilan yönetimi

// 1. İlan Ekleme Sayfası
app.get("/admin/add-district", requireAuth, (req, res) => {
  res.render("add-district", {
    user: req.session.user,
    districts,
    error: null,
  });
});

// 2. İlan Ekleme İşlemi
app.post(
  "/admin/add-district",
  requireAuth,
  upload.fields([
    { name: "kapak_resim", maxCount: 1 },
    { name: "normal_resimler", maxCount: 5 },
  ]),
  async (req, res) => {
    const {
      district,
      baslik,
      telefon_no,
      adres,
      aciklama,
      yas,
      sayfa_sira_no,
      ilce_adi,
    } = req.body;

    if (!district || !baslik || !telefon_no || !sayfa_sira_no) {
      return res.render("add-district", {
        user: req.session.user,
        districts,
        error: "Zorunlu alanlar eksik",
      });
    }

    const kapakResim = req.files["kapak_resim"]
      ? `/img/${req.files["kapak_resim"][0].filename}`
      : null;
    const normalResimler = req.files["normal_resimler"]
      ? req.files["normal_resimler"]
          .map((file) => `/img/${file.filename}`)
          .join(",")
      : null;

    const db = await readDB();
    if (!db.districts[district]) db.districts[district] = [];

    // Aynı sayfa_sira_no ile başka bir kayıt varsa hata döndür
    const existing = db.districts[district].find(
      (item) => item.sayfa_sira_no === parseInt(sayfa_sira_no)
    );
    if (existing) {
      return res.render("add-district", {
        user: req.session.user,
        districts,
        error: "Bu sıra numarası zaten kullanılıyor",
      });
    }

    db.districts[district].push({
      baslik,
      telefon_no,
      kapak_resim: kapakResim,
      adres,
      normal_resimler: normalResimler,
      aciklama,
      yas,
      sayfa_sira_no: parseInt(sayfa_sira_no),
      ilce_adi: ilce_adi || district,
    });

    await writeDB(db);
    res.redirect("/admin-index?success=İlan başarıyla eklendi");
  }
);

// 3. İlan Listeleme
app.get("/admin/list-districts", requireAuth, async (req, res) => {
  const { district } = req.query;
  const selectedDistrict = district || "buyukorhan";
  const db = await readDB();
  const listings = db.districts[selectedDistrict] || [];

  res.render("list-districts", {
    user: req.session.user,
    districts,
    listings,
    currentDistrict: selectedDistrict,
    error: null,
    success: req.query.success || null,
  });
});

// 4. İlan Güncelleme Sayfası
app.get("/admin/edit-district/:district/:id", requireAuth, async (req, res) => {
  const { district, id } = req.params;
  const db = await readDB();
  const listing = db.districts[district]?.find(
    (item) => item.sayfa_sira_no === parseInt(id)
  );

  if (!listing) {
    return res.redirect("/admin/list-districts?error=İlan bulunamadı");
  }

  res.render("edit-district", {
    user: req.session.user,
    districts,
    listing,
    currentDistrict: district,
    error: req.query.error || null,
  });
});

// 5. İlan Güncelleme İşlemi
app.post(
  "/admin/edit-district/:district/:id",
  requireAuth,
  upload.fields([
    { name: "kapak_resim", maxCount: 1 },
    { name: "normal_resimler", maxCount: 5 },
  ]),
  async (req, res) => {
    const { district, id } = req.params;
    const {
      baslik,
      telefon_no,
      adres,
      aciklama,
      yas,
      sayfa_sira_no,
      ilce_adi,
    } = req.body;

    const kapakResim = req.files["kapak_resim"]
      ? `/img/${req.files["kapak_resim"][0].filename}`
      : req.body.existing_kapak_resim;
    const normalResimler = req.files["normal_resimler"]
      ? req.files["normal_resimler"]
          .map((file) => `/img/${file.filename}`)
          .join(",")
      : req.body.existing_normal_resimler;

    const db = await readDB();
    const listingIndex = db.districts[district]?.findIndex(
      (item) => item.sayfa_sira_no === parseInt(id)
    );

    if (listingIndex === -1) {
      return res.redirect(
        `/admin/edit-district/${district}/${id}?error=İlan bulunamadı`
      );
    }

    // Aynı sayfa_sira_no başka bir kayıtla çakışıyorsa hata
    if (
      parseInt(sayfa_sira_no) !== parseInt(id) &&
      db.districts[district].some(
        (item) => item.sayfa_sira_no === parseInt(sayfa_sira_no)
      )
    ) {
      return res.redirect(
        `/admin/edit-district/${district}/${id}?error=Bu sıra numarası zaten kullanılıyor`
      );
    }

    db.districts[district][listingIndex] = {
      baslik,
      telefon_no,
      kapak_resim: kapakResim,
      adres,
      normal_resimler: normalResimler,
      aciklama,
      yas,
      sayfa_sira_no: parseInt(sayfa_sira_no),
      ilce_adi: ilce_adi || district,
    };

    await writeDB(db);
    res.redirect("/admin/list-districts?success=İlan başarıyla güncellendi");
  }
);

// 6. İlan Silme
app.post("/admin/delete-district/:district/:id", requireAuth, async (req, res) => {
  const { district, id } = req.params;
  const db = await readDB();

  if (!db.districts[district]) {
    return res.redirect("/admin/list-districts?error=İlan bulunamadı");
  }

  db.districts[district] = db.districts[district].filter(
    (item) => item.sayfa_sira_no !== parseInt(id)
  );

  await writeDB(db);
  res.redirect("/admin/list-districts?success=İlan başarıyla silindi");
});

// 404 Hata Yönlendirmesi
app.use((req, res, next) => {
  res.status(404).render("404", {
    error: "Sayfa Bulunamadı",
    message: "Aradığınız sayfa mevcut değil veya kaldırılmış olabilir.",
  });
});

// Hata yönetimi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    message: err.message || "Bir hata oluştu!",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});