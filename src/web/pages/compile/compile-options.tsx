/** @jsxImportSource hono/jsx */
import { CheckboxField, PrimaryButton } from "../ui/index.js";

export function CompileOptions() {
  return (
    <div class="space-y-3 mb-5">
      <CheckboxField
        id="opt-force"
        label="Force recompile"
        description="Delete existing articles and reprocess everything from scratch"
      />
      <CheckboxField
        id="opt-sources-only"
        label="Sources only"
        description="Skip concept extraction after compiling sources"
      />
      <CheckboxField
        id="opt-concepts-only"
        label="Concepts only"
        description="Regenerate all concept articles from existing compiled sources"
      />
      <PrimaryButton id="compile-btn" onclick="runCompile()">
        Run Compile
      </PrimaryButton>
    </div>
  );
}
