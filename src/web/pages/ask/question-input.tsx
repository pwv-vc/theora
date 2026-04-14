/** @jsxImportSource hono/jsx */
import { Input, PrimaryButton } from "../ui/index.js";

interface QuestionInputProps {
  initialPlaceholder: string;
}

export function QuestionInput({ initialPlaceholder }: QuestionInputProps) {
  return (
    <div class="flex gap-3 mb-4">
      <Input
        inputSize="md"
        class="flex-1 transition-opacity duration-300"
        id="question-input"
        type="text"
        placeholder={initialPlaceholder}
        onkeydown="if(event.key==='Enter')askQuestion()"
      />
      <PrimaryButton onclick="askQuestion()" id="ask-btn">Ask</PrimaryButton>
    </div>
  );
}
