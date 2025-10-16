import express from "express";
import path from "path";
import { readFile, writeFile } from "fs/promises";
import crypto from "crypto";

//global variables
const app = express();
const PORT = process.env.PORT || 8002;
const staticFilePath = path.join(import.meta.dirname, "public");
const DATA_FILE = path.join("data", "links.json");

//middlewares
app.use(express.static(staticFilePath));
app.use(express.urlencoded({ extended: true }));

//functions
const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}), "utf-8");
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

//routes

app.get("/", async (req, res) => {
  try {
    const file = await readFile(
      path.join(import.meta.dirname, "views", "index.html")
    );

    const links = await loadLinks();

    const content = file.toString().replaceAll(
      "{{shortened-urls}}",
      Object.entries(links)
        .map(([shortCode, url]) => {
          const truncatedUrl =
            url.length >= 30 ? `${url.slice(0, 30)}...` : url;
          return `<li><a href="/${shortCode}" target="_blank">${req.host}/${shortCode}</a>${truncatedUrl}</li>`;
        })
        .join("")
    );

    return res.send(content);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/", async (req, res) => {
  try {
    const { url, shortCode } = req.body;
    console.log(req.body);

    const finalShortCode = shortCode || crypto.randomBytes(7).toString("hex");

    const links = await loadLinks();

    if (links[finalShortCode]) {
      return res
        .status(400)
        .sendFile(path.join(import.meta.dirname, "views", "404.html"));
    }
    links[finalShortCode] = url;
    await saveLinks(links);
    return res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;
    const links = await loadLinks();
    if (!links[shortCode]) {
      return res.status(404).send("404 error occurred");
    }
    return res.redirect(links[shortCode]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server : http://localhost:${PORT}`);
});
