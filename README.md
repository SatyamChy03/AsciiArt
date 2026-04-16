# AsciiArt
# 🎥 Cyberpunk ASCII Camera

A real-time webcam-based ASCII art generator that converts your live camera feed into stylized text visuals with cyberpunk effects. This project runs entirely in the browser using the Canvas API—no backend required.

---

## 🚀 Features

### 🔴 Live ASCII Rendering

* Captures webcam feed using `getUserMedia`
* Converts frames into ASCII in real-time (~15–25 FPS)
* Optimized resolution for smooth performance

### 🎭 Multiple Rendering Modes

* **Normal Mode** – Standard ASCII using density-based characters
* **Binary Mode** – Converts frames into `0` and `1` patterns
* **Cyberpunk Mode** – Glitch-style output using symbols and randomness
* **Alphabet Mode** – Uses letters (A–Z) for stylized rendering
* **Cyberpunk Alphabet Mode** – Hybrid of letters + noise for a futuristic look

### 🎚️ Image Controls

* **Brightness Slider** (−100 to +100)
* **Contrast Slider** (−100 to +100)
* Applied before ASCII conversion for better accuracy

### 🎨 Color Themes

* Neon Green (`#00ff9f`)
* Neon Purple (`#bc13fe`)
* Neon Red (`#ff073a`)
* Black background for high contrast

### 📁 Export Options

* Download current ASCII frame as `.txt`
* Uses Blob API for file generation

### 🎥 ASCII Video Recording

* Record live ASCII output
* Export as `.webm` using MediaRecorder API
* Start/Stop recording controls

---

## 🧠 How It Works

1. Camera feed is accessed via `navigator.mediaDevices.getUserMedia`
2. Each frame is drawn to a hidden `<canvas>`
3. Pixel data is extracted and converted to grayscale
4. Brightness and contrast adjustments are applied
5. Pixels are mapped to characters based on intensity
6. ASCII output is rendered inside a `<pre>` element
7. Optional modes apply randomness for stylized effects

---

## 🛠️ Tech Stack

* HTML5
* CSS3 (Cyberpunk UI styling)
* Vanilla JavaScript
* Canvas API
* MediaDevices API
* MediaRecorder API

---

## 📂 Project Structure

```bash
/project
 ├── index.html
 ├── styles.css
 └── script.js
```

---

## ▶️ Getting Started

1. Clone the repository:

```bash
git clone https://github.com/your-username/cyberpunk-ascii-camera.git
```

2. Open the project folder:

```bash
cd cyberpunk-ascii-camera
```

3. Run the app:

* Open `index.html` in your browser
* Allow camera access when prompted

---

## ⚠️ Limitations

* Performance depends on device hardware and browser
* High resolution may reduce FPS
* Camera quality affects ASCII clarity
* Works best in modern browsers (Chrome recommended)

---

## 💡 Future Improvements

* Adjustable resolution scaling
* Custom character set input
* GIF export support
* Face detection for focused rendering
* Mobile optimization

---

## 📄 License

This project is licensed under the MIT License.

---

## 🔥 Demo

*(Add your deployed link here — GitHub Pages / Vercel recommended)*

---

## 🧩 Contribution

Pull requests are welcome. For major changes, open an issue first to discuss what you would like to change.

---

## ⭐ Final Note

This project is not just an ASCII converter—it’s a real-time visual processing system that combines image manipulation, text rendering, and creative effects to produce a cyberpunk-style output.
