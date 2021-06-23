class Logger {
  console: globalThis.Console | any;

  name: string;

  // If a console has been passed, use it. Otherwise use window.console
  constructor(name?: string, console?: globalThis.Console | any) {
    this.console = console ?? window.console;
    this.name = name ?? 'ewc';
  }

  // Produce a namespaced console warning
  warn(message: any) {
    if (this.console && this.console.warn != null) {
      this.console.warn(`${this.name}: ${message}`);
    }
  }

  // Produce a namespeced console log
  log(message: any) {
    if (this.console && this.console.log != null) {
      this.console.log(`${this.name}: ${message}`);
    }
  }
}

const logger = new Logger();
export default logger;
