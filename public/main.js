// Wait for DOM to be fully loaded before attaching events
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("generateBtn");
  const input = document.getElementById("originalUrl");
  const resultDiv = document.getElementById("result");

  if (!btn || !input || !resultDiv) {
    console.error("SnapLink: One or more elements not found in DOM. Check your HTML IDs.");
    return;
  }

  async function handleGenerate() {
    const originalUrl = input.value.trim();

    if (!originalUrl) {
      resultDiv.innerHTML = `<p class="error-msg">⚠ Please enter a URL first.</p>`;
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Generating...';
    resultDiv.innerHTML = "";

    try {
      console.log("Sending request to /shorten with:", originalUrl);

      const res = await fetch("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl }),
      });

      console.log("Response status:", res.status);

      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        resultDiv.innerHTML = `<p class="error-msg">⚠ ${data.error || "Something went wrong."}</p>`;
        return;
      }

      const created = new Date(data.createdAt).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      resultDiv.innerHTML = `
        <div class="result-block">
          <div class="result-row">
            <a class="result-url" href="${data.shortUrl}" target="_blank">${data.shortUrl}</a>
            <button class="btn-copy" id="copyBtn" data-url="${data.shortUrl}">Copy</button>
          </div>
          <hr class="divider" />
          <div class="qr-wrap">
            <img src="${data.qrCode}" alt="QR Code" />
            <div class="meta">
              <div class="meta-item">
                <div class="meta-key">Original URL</div>
                <div class="meta-val">${data.originalUrl}</div>
              </div>
              <div class="meta-item">
                <div class="meta-key">Created</div>
                <div class="meta-val">${created} UTC</div>
              </div>
              <div class="meta-item">
                <div class="meta-key">Status</div>
                <span class="badge">⚡ One-Shot Active</span>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById("copyBtn").addEventListener("click", function () {
        navigator.clipboard.writeText(this.dataset.url).then(() => {
          this.textContent = "Copied!";
          this.classList.add("copied");
          setTimeout(() => {
            this.textContent = "Copy";
            this.classList.remove("copied");
          }, 2000);
        }).catch(() => {
          // Fallback for browsers that block clipboard without HTTPS
          this.textContent = "Copy failed";
        });
      });

    } catch (err) {
      console.error("SnapLink fetch error:", err);
      resultDiv.innerHTML = `<p class="error-msg">⚠ Could not reach server. Is it running? (${err.message})</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Generate";
    }
  }

  btn.addEventListener("click", handleGenerate);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleGenerate();
  });
});