import type { Hook, HookContext, HookStage, HooksConfig } from './types';

/**
 * Hook registry that manages hooks for different lifecycle stages
 */
export class HookRegistry {
  private hooks: Map<HookStage, Hook[]> = new Map();

  constructor(config?: HooksConfig) {
    if (config) {
      this.registerFromConfig(config);
    }
  }

  /**
   * Register hooks from a configuration object
   */
  registerFromConfig(config: HooksConfig): void {
    for (const [stage, hooks] of Object.entries(config)) {
      if (hooks && Array.isArray(hooks)) {
        for (const hook of hooks) {
          this.register(stage as HookStage, hook);
        }
      }
    }
  }

  /**
   * Register a hook for a specific stage
   */
  register(stage: HookStage, hook: Hook): void {
    if (!this.hooks.has(stage)) {
      this.hooks.set(stage, []);
    }

    this.hooks.get(stage)?.push(hook);
  }

  /**
   * Remove a specific hook from a stage
   */
  remove(stage: HookStage, hook: Hook): boolean {
    const hooks = this.hooks.get(stage);
    if (!hooks) {
      return false;
    }

    const index = hooks.indexOf(hook);
    if (index === -1) {
      return false;
    }

    hooks.splice(index, 1);
    return true;
  }

  /**
   * Clear all hooks for a specific stage, or all hooks if no stage is provided
   */
  clear(stage?: HookStage): void {
    if (stage) {
      this.hooks.delete(stage);
    } else {
      this.hooks.clear();
    }
  }

  /**
   * Get all hooks for a specific stage
   */
  get(stage: HookStage): Hook[] {
    return this.hooks.get(stage) || [];
  }

  /**
   * Execute all hooks for a specific stage in registration order
   */
  async execute(stage: HookStage, context: HookContext): Promise<void> {
    const hooks = this.get(stage);
    for (const hook of hooks) {
      await hook(context);
    }
  }

  /**
   * Check if any hooks are registered for a stage
   */
  has(stage: HookStage): boolean {
    if (!this.hooks.has(stage)) {
      return false;
    }
    const hooks = this.hooks.get(stage);
    if (!hooks) {
      return false;
    }
    return hooks.length > 0;
  }
}
