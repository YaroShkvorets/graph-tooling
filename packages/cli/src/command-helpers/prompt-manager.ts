import { prompt } from 'gluegun';
import { PromptOptions } from 'gluegun/build/types/toolbox/prompt-enquirer-types';

export class PromptManager {
  private steps: PromptOptions[] = [];
  private currentStep = 0;
  private results: any[] = [];

  addStep(options: PromptOptions) {
    this.steps.push(options);
  }

  // runs all steps and returns the results
  async execute() {
    return prompt.ask(this.steps);
  }

  // allows going back with Escape and returns the results
  async executeInteractive() {
    let isCtrlC = false;
    // gluegun always throws empty string so we don't know what caused the exception, so we need this workaround to handle Ctrl+C
    const keypressHandler = (_: string, key: { name: string; ctrl: boolean }) => {
      isCtrlC = key.ctrl && key.name === 'c';
    };
    process.stdin.on('keypress', keypressHandler);

    while (this.currentStep < this.steps.length) {
      try {
        this.results[this.currentStep] = await prompt.ask(this.steps[this.currentStep]);
        this.currentStep++;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        if (isCtrlC || this.currentStep === 0) {
          process.stdout.write('\n');
          process.exit(0);
        }
        // delete 2 lines
        process.stdout.write('\x1b[1A\x1b[2K\x1b[1A\x1b[2K');
        this.currentStep--;
        while (this.currentStep > 0) {
          delete this.results[this.currentStep];
          const skip = this.steps[this.currentStep].skip;
          const shouldSkip = typeof skip === 'function' ? await skip({}) : skip;
          if (!shouldSkip) break;
          this.currentStep--;
        }
      }
    }

    process.stdin.removeListener('keypress', keypressHandler);
    return this.results;
  }
}