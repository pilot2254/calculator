import { BUTTON_LAYOUT, KEYBOARD_MAPPINGS } from "../config/buttons.config.js";
import { THEMES, DEFAULT_THEME } from "../config/theme.config.js";
import { APP_CONFIG } from "../config/app.config.js";
import { createLogger } from "../utils/logger.js";
import CalculatorEngine from "./calculator-engine.js";
import type { ButtonConfig, KeyboardMapping } from "../types/index.js";

const logger = createLogger("ui-controller");

interface CachedElements {
  calculator: HTMLElement | null;
  display: HTMLElement | null;
  currentOperand: HTMLElement | null;
  previousOperand: HTMLElement | null;
  buttonsContainer: HTMLElement | null;
}

export class UIController {
  private engine = new CalculatorEngine();
  private currentTheme = DEFAULT_THEME;
  private elements: CachedElements = {
    calculator: null,
    display: null,
    currentOperand: null,
    previousOperand: null,
    buttonsContainer: null,
  };

  constructor() {
    this.init();
    logger.info("UI Controller initialized");
  }

  private init(): void {
    this.cacheElements();
    this.generateButtons();
    this.attachEventListeners();
    this.applyTheme(this.currentTheme);
    this.updateDisplay();
  }

  private cacheElements(): void {
    this.elements = {
      calculator: document.querySelector(".calculator"),
      display: document.querySelector(".display"),
      currentOperand: document.getElementById("current-operand"),
      previousOperand: document.getElementById("previous-operand"),
      buttonsContainer: document.querySelector(".buttons"),
    };

    logger.debug("DOM elements cached");
  }

  private generateButtons(): void {
    if (!this.elements.buttonsContainer) return;

    this.elements.buttonsContainer.innerHTML = "";

    BUTTON_LAYOUT.forEach((row) => {
      row.forEach((buttonConfig) => {
        const button = this.createButton(buttonConfig);
        this.elements.buttonsContainer!.appendChild(button);
      });
    });

    logger.debug("Buttons generated from configuration");
  }

  private createButton(config: ButtonConfig): HTMLElement {
    const button = document.createElement("button");

    button.textContent = config.label;
    button.className = `btn ${config.class}`;
    
    if (config.type) button.classList.add(`btn-${config.type}`);
    if (config.span) button.style.gridColumn = `span ${config.span}`;
    if (config.type) button.dataset.type = config.type;
    if (config.action) button.dataset.action = config.action;
    if (config.value) button.dataset.value = config.value;

    button.addEventListener("click", (event) => {
      this.handleButtonClick(config, event);
    });

    return button;
  }

  private handleButtonClick(config: ButtonConfig, event: Event): void {
    if (APP_CONFIG.display.animateButtons && event.target instanceof HTMLElement) {
      this.animateButton(event.target);
    }

    switch (config.type) {
      case "number":
        if (config.value) this.engine.inputNumber(config.value);
        break;
      case "operator":
        if (config.action) this.engine.chooseOperation(config.action as any);
        break;
      case "equals":
        this.engine.calculate();
        break;
      case "special":
        if (config.action) this.handleSpecialAction(config.action);
        break;
    }

    this.updateDisplay();
    logger.debug(`Button clicked: ${config.label}`);
  }

  private handleSpecialAction(action: string): void {
    switch (action) {
      case "clear":
        this.engine.reset();
        break;
      case "delete":
        this.engine.delete();
        break;
      case "percent":
        this.engine.percentage();
        break;
    }
  }

  private animateButton(button: HTMLElement): void {
    button.style.transform = "scale(0.95)";
    setTimeout(() => {
      button.style.transform = "scale(1)";
    }, 100);
  }

  private attachEventListeners(): void {
    if (APP_CONFIG.features.keyboardSupport) {
      document.addEventListener("keydown", (e) => this.handleKeyboardInput(e));
    }

    logger.debug("Event listeners attached");
  }

  private handleKeyboardInput(event: KeyboardEvent): void {
    const mapping = KEYBOARD_MAPPINGS[event.key];

    if (!mapping) return;

    if (event.key === "/" || event.key === "Enter") {
      event.preventDefault();
    }

    this.handleButtonClick(mapping as ButtonConfig, event);
    this.highlightKeyboardButton(mapping);

    logger.debug(`Keyboard input: ${event.key}`);
  }

  private highlightKeyboardButton(mapping: KeyboardMapping): void {
    const button = this.findButtonByMapping(mapping);
    if (button && APP_CONFIG.display.animateButtons) {
      button.classList.add("keyboard-active");
      setTimeout(() => {
        button.classList.remove("keyboard-active");
      }, 150);
    }
  }

  private findButtonByMapping(mapping: KeyboardMapping): HTMLElement | null {
    if (!this.elements.buttonsContainer) return null;

    const selector = mapping.value 
      ? `[data-value="${mapping.value}"]` 
      : `[data-action="${mapping.action}"]`;

    return this.elements.buttonsContainer.querySelector(selector);
  }

  private updateDisplay(): void {
    const state = this.engine.getDisplayState();

    if (this.elements.currentOperand) {
      this.elements.currentOperand.textContent = state.current;
    }

    if (this.elements.previousOperand && APP_CONFIG.display.showPreviousOperation) {
      this.elements.previousOperand.textContent = state.previous;
    }

    if (this.elements.display) {
      this.elements.display.classList.toggle("error", state.hasError);
    }

    logger.debug("Display updated:", state);
  }

  applyTheme(themeName: string): void {
    const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];

    if (!theme) {
      logger.error("Theme not found:", themeName);
      return;
    }

    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value);
    });

    root.style.setProperty("--font-primary", theme.fonts.primary);
    root.style.setProperty("--font-mono", theme.fonts.mono);
    root.style.setProperty("--border-radius", theme.borderRadius);
    root.style.setProperty("--button-border-radius", theme.buttonBorderRadius);

    this.currentTheme = themeName;
    logger.info("Theme applied:", themeName);
  }

  toggleTheme(): void {
    const themeNames = Object.keys(THEMES);
    const currentIndex = themeNames.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    const nextTheme = themeNames[nextIndex];

    this.applyTheme(nextTheme);
    logger.info("Theme toggled to:", nextTheme);
  }
}

export default UIController;