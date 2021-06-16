const Plugin = require("../plugin");

module.exports = new Plugin({
  name: "GooseMod Loader (fake)" /* Human-readable plugin name. */,
  author:
    "smartfridge#5834" /* [Optional] Put your name here to give yourself credit for making it :) */,
  description:
    "This is a fake plugin so people don't get broken plugin after update. Feel free to remove GooseMod.js from your plugins folder." /* Description of what this plugin does. */,
  preload: false /* [Optional] If true, load this before Discord has finished starting up */,
  color:
    "#632" /* [Optional] The color that this plugin shows in logs and in the plugin settings tab. Any valid CSS color will work here. */,
  disabledByDefault: true /* [Optional] If true, disable the plugin until the user enables it in settings */,

  load: function () {
    /* What your plugin does when Discord is loaded, or when the plugin is reloaded. */
    console.log("fake plugin")
  },
  unload: function () {
    /* What your plugin does when it is disabled or being reloaded. */
  },
});
