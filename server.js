require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  "/img",
  express.static(path.join(__dirname, "views", "img"), {
    fallthrough: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let db = { admins: [], districts: {} };

async function readDB() {
  try {
    return db;
  } catch (error) {
    console.error("Veri okuma hatası:", error);
    return { admins: [], districts: {} };
  }
}

async function writeDB(data) {
  try {
    db = data;
    console.log("Bellek içi veritabanı güncellendi");
  } catch (error) {
    console.error("Veri yazma hatası:", error);
  }
}

function sha512(password) {
  return crypto.createHash("sha512").update(password).digest("hex");
}

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
    admin.last_login = new Date().toISOString();
    await writeDB(db);
    return res.redirect("/admin-index");
  } else {
    return res.render("admin-login", {
      error: "Kullanıcı adı veya şifre hatalı",
    });
  }
});

app.get("/admin-index", (req, res) => {
  res.render("admin-index", {
    success: req.query.success || null,
    error: req.query.error || null,
  });
});

app.get("/jordi", (req, res) => {
  res.render("admin-login", { error: null });
});

const createSimpleRoute = (routeName) => {
  app.get(`/${routeName}`, (req, res) => {
    res.render(routeName, { error: null });
  });
};

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

const districts = [
  "buyukorhan", "gemlik", "gursu", "harmancik", "inegol", "iznik", "karacabey",
  "keles", "kestel", "mudanya", "mustafakemalpasa", "nilufer", "orhaneli",
  "orhangazi", "osmangazi", "yenisehir", "yildirim",
];

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

app.get("/", (req, res) => {
  res.render("index", { error: null });
});

app.get("/sitemap", (req, res) => {
  res.render("sitemap", { error: null });
});

app.get("/admin/add-district", (req, res) => {
  res.render("add-district", {
    districts,
    error: null,
  });
});

app.post("/admin/add-district", async (req, res) => {
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
      districts,
      error: "Zorunlu alanlar eksik",
    });
  }

  const db = await readDB();
  if (!db.districts[district]) db.districts[district] = [];

  const existing = db.districts[district].find(
    (item) => parseInt(item.sayfa_sira_no) === parseInt(sayfa_sira_no)
  );
  if (existing) {
    return res.render("add-district", {
      districts,
      error: "Bu sıra numarası zaten kullanılıyor",
    });
  }

  db.districts[district].push({
    baslik,
    telefon_no,
    kapak_resim: null,
    adres,
    normal_resimler: null,
    aciklama,
    yas,
    sayfa_sira_no: parseInt(sayfa_sira_no),
    ilce_adi: ilce_adi || district,
  });

  await writeDB(db);
  res.redirect("/admin-index?success=İlan başarıyla eklendi");
});

app.get("/admin/list-districts", async (req, res) => {
  const { district } = req.query;
  const selectedDistrict = district || "buyukorhan";
  const db = await readDB();
  const listings = db.districts[selectedDistrict] || [];

  res.render("list-districts", {
    districts,
    listings,
    currentDistrict: selectedDistrict,
    error: null,
    success: req.query.success || null,
  });
});

app.get("/admin/edit-district/:district/:id", async (req, res) => {
  const { district, id } = req.params;
  const db = await readDB();
  const listing = db.districts[district]?.find(
    (item) => parseInt(item.sayfa_sira_no) === parseInt(id)
  );

  if (!listing) {
    return res.redirect("/admin/list-districts?error=İlan bulunamadı");
  }

  res.render("edit-district", {
    districts,
    listing,
    currentDistrict: district,
    error: req.query.error || null,
  });
});

app.post("/admin/edit-district/:district/:id", async (req, res) => {
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

  const db = await readDB();
  const listingIndex = db.districts[district]?.findIndex(
    (item) => parseInt(item.sayfa_sira_no) === parseInt(id)
  );

  if (listingIndex === -1) {
    return res.redirect(
      `/admin/edit-district/${district}/${id}?error=İlan bulunamadı`
    );
  }

  if (
    parseInt(sayfa_sira_no) !== parseInt(id) &&
    db.districts[district].some(
      (item) => parseInt(item.sayfa_sira_no) === parseInt(sayfa_sira_no)
    )
  ) {
    return res.redirect(
      `/admin/edit-district/${district}/${id}?error=Bu sıra numarası zaten kullanılıyor`
    );
  }

  db.districts[district][listingIndex] = {
    baslik,
    telefon_no,
    kapak_resim: db.districts[district][listingIndex].kapak_resim,
    adres,
    normal_resimler: db.districts[district][listingIndex].normal_resimler,
    aciklama,
    yas,
    sayfa_sira_no: parseInt(sayfa_sira_no),
    ilce_adi: ilce_adi || district,
  };

  await writeDB(db);
  res.redirect("/admin/list-districts?success=İlan başarıyla güncellendi");
});

app.post("/admin/delete-district/:district/:id", async (req, res) => {
  const { district, id } = req.params;
  const db = await readDB();

  if (!db.districts[district]) {
    return res.redirect("/admin/list-districts?error=İlan bulunamadı");
  }

  db.districts[district] = db.districts[district].filter(
    (item) => parseInt(item.sayfa_sira_no) !== parseInt(id)
  );

  await writeDB(db);
  res.redirect("/admin/list-districts?success=İlan başarıyla silindi");
});

app.use((req, res, next) => {
  res.status(404).render("404", {
    error: "Sayfa Bulunamadı",
    message: "Aradığınız sayfa mevcut değil veya kaldırılmış olabilir.",
  });
});

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
