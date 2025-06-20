class Tooltips {
  static pluginTitle = "wmTooltips";
  static defaultSettings = {
    content: "This is placeholder content",
    allowHTML: true,
    offset: [0, 10],
    customIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-question-mark">
  <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1"/>
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"/>
  <path d="M12 19l0 .01"/>
</svg>`,
    type: "text",
    interactive: true,
    colorTheme: "white",
    trigger: 'mouseenter focus',
  };
  static get userSettings() {
    return window["wmTooltipSettings"] || {};
  }
  constructor() {
    this.loadingState = "building";

    this.settings = this.deepMerge(
      {},
      Tooltips.defaultSettings,
      Tooltips.userSettings,
      this.instanceSettings
    );

    this.init();
  }
  async init() {
    const self = this;
    this.emitEvent("wmTooltips:beforeInit", self);

    if (this.settings.formTooltips === true) {
      this.buildFormTooltips();
    }

    this.tooltipItems = window.wmTooltipItems || [];

    this.tooltipItems.forEach((item, index) => {
      if (!item.href || !item.content) {
        console.warn(
          `Tooltip item at index ${index} missing href or content:`,
          item
        );
        return;
      }

      this.buildStandardTooltipStructure(item);
    });

    this.loadingState = "built";
    this.emitEvent("wmTooltips:afterInit", self);
  }

  deepMerge(...objs) {
    function getType(obj) {
      return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    }
    function mergeObj(clone, obj) {
      for (let [key, value] of Object.entries(obj)) {
        let type = getType(value);
        if (type === "object" || type === "array") {
          if (clone[key] === undefined) {
            clone[key] = type === "object" ? {} : [];
          }
          mergeObj(clone[key], value); // Corrected recursive call
        } else if (type === "function") {
          clone[key] = value; // Directly reference the function
        } else {
          clone[key] = value;
        }
      }
    }
    if (objs.length === 0) {
      return {};
    }
    let clone = {};
    objs.forEach(obj => {
      mergeObj(clone, obj);
    });
    return clone;
  }

  buildStandardTooltipStructure(item) {
    let targetSelector = `[href$="${item.href}"]`;
    this.targetElements = document.querySelectorAll(targetSelector);

    // Exit early if no elements found
    if (!this.targetElements || this.targetElements.length === 0) {
      console.warn(`No elements found for selector: ${targetSelector}`);
      return;
    }

    this.targetElements.forEach(originalElement => {
      let currentElement = originalElement;

      const tooltipSettings = this.deepMerge(
        {},
        Tooltips.defaultSettings,
        Tooltips.userSettings,
        item
      );

      const originalHref = originalElement.getAttribute("href");

      // Handle span conversion FIRST and capture the new element
      if (originalHref && originalHref.startsWith("#")) {
        currentElement = this.changeToSpan(originalElement);
      }

      // Modify href if it exists (after potential span conversion)
      if (currentElement.href) {
        currentElement.href = currentElement.href.split("#")[0];
      }

      // Handle icon creation
      let tooltipTarget = currentElement;
      if (item.icon === true) {
        let iconElement = this.createIcon();

        if (currentElement && iconElement) {
          // currentElement.style.position = "relative";
          // currentElement.style.display = "inline-block";
          currentElement.appendChild(iconElement);
          // Use the icon as the tooltip target
          tooltipTarget = iconElement;
        }
      }

      // Initialize tooltip on the correct target
      tooltipTarget.dataset.tooltipHref = item.href;
      const appendTarget =
        document.querySelector("#siteWrapper") || document.body;
      tippy(tooltipTarget, {
        content: tooltipSettings.content,
        interactive: tooltipSettings.interactive,
        placement: tooltipSettings.placement,
        theme: "wm-tooltip",
        allowHTML: tooltipSettings.allowHTML,
        offset: tooltipSettings.offset,
        trigger: tooltipSettings.trigger,
        appendTo: appendTarget,
        onMount: instance => {
          this.setClasses(instance, item);
        },
      });

      // Apply parent styling to the current element (not the tooltip target)
      this.parentStyling(currentElement);
    });
  }

  buildFormTooltips() {
    window.addEventListener("load", () => {
      let formFields = document.querySelectorAll(".form-block .form-item");

      formFields.forEach(field => {
        let description = field.querySelector("legend > .description, :scope > .description");

        if (description) {
          let tooltipContent = description.innerText;
          let tooltipParent = field.querySelector(".title");
          let tooltipTarget = tooltipParent;

          let iconElement = this.createIcon();

          if (iconElement) {
            tooltipParent.style.position = "relative";
            tooltipParent.style.display = "inline-block";
            tooltipParent.appendChild(iconElement);
            // Use the icon as the tooltip target
            tooltipTarget = iconElement;
          }

          // Initialize tooltip on the correct target
          const appendTarget =
            document.querySelector("#siteWrapper") || document.body;

          tippy(tooltipTarget, {
            content: tooltipContent,
            interactive: this.settings.interactive,
            placement: this.settings.placement,
            theme: "wm-tooltip",
            allowHTML: this.settings.allowHTML,
            offset: this.settings.offset,
            trigger: this.settings.trigger,
            appendTo: appendTarget,
            onMount: instance => {
              this.setFormClasses(instance, field);
            },
          });

          // Apply parent styling to the current element (not the tooltip target)
          this.parentStyling(tooltipParent);
          description.style.display = "none";

        }
      });
    });
  }

  setClasses(instance, item) {
    instance.popper.classList.add("wm-tooltip");
    instance.popper.setAttribute("data-wm-plugin", "tooltip");
    instance.popper.dataset.sectionTheme = this.settings.colorTheme;

    const hrefClass = item.href
      .replace("#", "")
      .replace(/[^a-zA-Z0-9-_]/g, "-");
    instance.popper.classList.add(hrefClass);

    const tippyBox = instance.popper.querySelector(".tippy-box");
    if (tippyBox) {
      tippyBox.classList.add("wm-tooltip-box");
    }

    const tippyArrow = instance.popper.querySelector(".tippy-arrow");
    if (tippyArrow) {
      tippyArrow.classList.add("wm-tooltip-arrow");
    }

    const tippyContent = instance.popper.querySelector(".tippy-content");
    if (tippyContent) {
      tippyContent.classList.add("wm-tooltip-content");
    }
  }

  setFormClasses(instance, field) {
    instance.popper.classList.add("wm-tooltip", "wm-form-tooltip");
    instance.popper.setAttribute("data-wm-plugin", "tooltip");

    const tippyBox = instance.popper.querySelector(".tippy-box");
    if (tippyBox) {
      tippyBox.classList.add("wm-tooltip-box");
    }

    const tippyArrow = instance.popper.querySelector(".tippy-arrow");
    if (tippyArrow) {
      tippyArrow.classList.add("wm-tooltip-arrow");
    }

    const tippyContent = instance.popper.querySelector(".tippy-content");
    if (tippyContent) {
      tippyContent.classList.add("wm-tooltip-content");
    }
  }

  parentStyling(targetElement) {
    targetElement.classList.add("tooltip-parent");
    targetElement.setAttribute("data-wm-plugin", "tooltip");
  }

  createIcon() {
    // Create a container for the icon
    let iconElement = document.createElement("sup");
    let iconInnerElement = document.createElement("span");
    iconElement.className = "wm-tooltip-icon";
    iconElement.innerHTML = this.settings.customIcon;

    // Style the icon to appear on the right side
    iconElement.style.marginLeft = "5px";
    iconElement.style.display = "inline-block";
    iconElement.style.verticalAlign = "middle";
    iconElement.style.cursor = "pointer";

    iconElement.insertAdjacentElement("afterbegin", iconInnerElement);

    return iconElement;
  }

  changeToSpan(targetElement) {
    // Create a new span element
    const spanElement = document.createElement("span");

    // Copy all attributes except href
    Array.from(targetElement.attributes).forEach(attr => {
      if (attr.name !== "href") {
        spanElement.setAttribute(attr.name, attr.value);
      }
    });

    // Copy the inner content
    spanElement.innerHTML = targetElement.innerHTML;

    // Replace the a element with the span element
    targetElement.parentNode.replaceChild(spanElement, targetElement);

    // Update the reference to point to the new span element
    targetElement = spanElement;

    return spanElement;
  }

  get instanceSettings() {
    return this.item || {};
  }

  emitEvent(type, detail = {}, elem = document) {
    // Make sure there's an event type
    if (!type) return;

    // Create a new event
    let event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });

    // Dispatch the event
    return elem.dispatchEvent(event);
  }
}

(() => {
  function initTooltips() {
    const tooltipInstance = new Tooltips();
  }
  window.wmTooltips = {
    init: () => initTooltips(),
  };
  window.wmTooltips.init();
})();
