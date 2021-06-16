
const Plugin = require("../plugin");

const toggleCSS = () => {
    const css = window.ED.plugins.css_loader;
    if (window.ED.customCss || window.ED.cssWatcher) {
        return css.unload();
    } else {
        return css.load();
    }
};

module.exports = new Plugin({
    name: "Hide CSS",
    author: "Mark.#9999",
    description: "Disable your css for 5 seconds as to not give away you use a client mod.",
    preload: false,
    color: "#f44336",
    load: () => document.onkeyup = (key) => {
        if (key.code === 'Delete') {
            toggleCSS();
            setTimeout(function () {
                toggleCSS();
            }, 5000);
        }
    },
    unload: () => document.onkeyup = null
});
