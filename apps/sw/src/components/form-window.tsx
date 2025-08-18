"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Progress } from "@repo/ui/components/progress";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useCallback, useState } from "react";
import { FadeScrollView } from "./fade-scroll-view";
import { FormInput, FormTextarea } from "./form-inputs";
import { Window } from "./window";
import { WindowToolbar } from "./window-toolbar";

interface FormField {
  id: string;
  type: "text" | "email" | "textarea" | "number";
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

const demoSteps: FormStep[] = [
  {
    id: "personal",
    title: "Personal Information",
    description: "Tell us a bit about yourself",
    fields: [
      {
        id: "firstName",
        type: "text",
        label: "First Name",
        placeholder: "Enter your first name",
        required: true,
      },
      {
        id: "lastName",
        type: "text",
        label: "Last Name",
        placeholder: "Enter your last name",
        required: true,
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        placeholder: "your@email.com",
        required: true,
      },
    ],
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Help us customize your experience",
    fields: [
      {
        id: "company",
        type: "text",
        label: "Company",
        placeholder: "Your company name",
      },
      {
        id: "role",
        type: "text",
        label: "Job Title",
        placeholder: "What's your role?",
      },
      {
        id: "experience",
        type: "number",
        label: "Years of Experience",
        placeholder: "0",
      },
    ],
  },
  {
    id: "feedback",
    title: "Additional Information",
    description: "Anything else you'd like to share?",
    fields: [
      {
        id: "bio",
        type: "textarea",
        label: "Tell us about yourself",
        placeholder: "Share your background, interests, or goals...",
      },
      {
        id: "referral",
        type: "text",
        label: "How did you hear about us?",
        placeholder: "Social media, friend, search engine...",
      },
    ],
  },
];

export function FormWindow() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  const currentStep = demoSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === demoSteps.length - 1;
  const completedSteps = currentStepIndex;
  const totalSteps = demoSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep]);

  const goToPreviousStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSubmit = useCallback(() => {
    console.log("Form submitted:", formData);
  }, [formData]);

  const isCurrentStepValid = useCallback(() => {
    return currentStep?.fields.every((field) => {
      if (!field.required) {
        return true;
      }
      const value = formData[field.id];
      return value && value.trim().length > 0;
    });
  }, [currentStep?.fields, formData]);

  const renderField = useCallback(
    (field: FormField) => {
      const value = formData[field.id] || "";

      return (
        <div className="space-y-2" key={field.id}>
          <Label className="font-medium text-sm" htmlFor={field.id}>
            {field.label}
          </Label>
          {field.type === "textarea" ? (
            <FormTextarea
              className="min-h-[80px] resize-none"
              id={field.id}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              value={value}
            />
          ) : (
            <FormInput
              id={field.id}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              type={field.type}
              value={value}
            />
          )}
        </div>
      );
    },
    [formData, updateFieldValue]
  );

  return (
    <Window className="p-0">
      <WindowToolbar>
        <div
          className="flex items-center justify-center gap-2 transition-all duration-300 ease-out"
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
        >
          <Progress
            className="w-24 [&>div]:rounded-full"
            value={progressPercentage}
          />
          <Badge
            className="flex h-6 items-center rounded-full font-mono"
            variant={progressPercentage === 100 ? "default" : "secondary"}
          >
            {completedSteps}/{totalSteps}
          </Badge>
          <div
            className={`flex items-center gap-1 overflow-hidden transition-all duration-300 ease-out ${
              isToolbarHovered ? "max-w-32 opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            <Button
              className="h-6 w-6 rounded-full p-0"
              disabled={isFirstStep}
              onClick={goToPreviousStep}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button
              className="h-6 w-6 rounded-full p-0"
              disabled={isLastStep}
              onClick={goToNextStep}
              size="sm"
              variant="ghost"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </WindowToolbar>

      <div className="relative flex h-full flex-col">
        <FadeScrollView
          className="min-h-0 flex-1 px-3 py-3 pt-14"
          fadeSize={32}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-semibold text-xl">{currentStep?.title}</h2>
              {currentStep?.description && (
                <p className="text-muted-foreground text-sm">
                  {currentStep?.description}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {currentStep?.fields.map(renderField)}
            </div>
          </div>
        </FadeScrollView>

        <div className="glass3d absolute right-3 bottom-3 flex justify-end gap-0.5 rounded-full p-1 backdrop-blur-xs">
          {!isFirstStep && (
            <Button
              className="rounded-full"
              onClick={goToPreviousStep}
              variant="outline"
            >
              Previous
            </Button>
          )}

          {isLastStep ? (
            <Button
              className="gap-1 rounded-full"
              disabled={!isCurrentStepValid()}
              onClick={handleSubmit}
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit
            </Button>
          ) : (
            <Button
              className="rounded-full"
              disabled={!isCurrentStepValid()}
              onClick={goToNextStep}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </Window>
  );
}
