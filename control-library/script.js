const toast = document.querySelector(".toast");

function showToast(message) {
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
        toast.classList.remove("visible");
    }, 2200);
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
}

document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy]");
    const blockButton = event.target.closest("[data-copy-block]");

    if (!copyButton && !blockButton) {
        return;
    }

    const value = copyButton
        ? copyButton.dataset.copy
        : document.getElementById(blockButton.dataset.copyBlock)?.innerText;

    if (!value) {
        showToast("Nothing to copy");
        return;
    }

    try {
        await copyText(value.trim());
        showToast("Copied to clipboard");
    } catch (error) {
        showToast("Copy failed");
    }
});
