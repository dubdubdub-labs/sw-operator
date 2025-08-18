"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Progress } from "@repo/ui/components/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FadeScrollView } from "./fade-scroll-view";
import {
  GlassForm,
  GlassFormControl,
  GlassFormField,
  GlassFormItem,
  GlassFormLabel,
  GlassFormMessage,
  GlassInput,
  GlassTextarea,
} from "./form-inputs";
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

const createStepSchema = (fields: FormField[]) => {
  const schemaObject: Record<string, z.ZodString | z.ZodOptional<z.ZodString>> =
    {};

  for (const field of fields) {
    if (field.required) {
      schemaObject[field.id] = z.string().min(1, `${field.label} is required`);
    } else {
      schemaObject[field.id] = z.string().optional();
    }
  }

  return z.object(schemaObject);
};

const getAllFieldsSchema = () => {
  const allFields = demoSteps.flatMap((step) => step.fields);
  return createStepSchema(allFields);
};

type FormData = z.infer<ReturnType<typeof getAllFieldsSchema>>;

export function FormWindow() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  const currentStep = demoSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === demoSteps.length - 1;
  const completedSteps = currentStepIndex;
  const totalSteps = demoSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const form = useForm<FormData>({
    resolver: zodResolver(getAllFieldsSchema()),
    defaultValues: {},
    mode: "onChange",
  });

  const goToNextStep = useCallback(async () => {
    if (!isLastStep && currentStep) {
      const stepSchema = createStepSchema(currentStep.fields);
      const stepData: Record<string, string> = {};

      for (const field of currentStep.fields) {
        stepData[field.id] = form.getValues(field.id as keyof FormData) || "";
      }

      const isValid = await stepSchema.safeParseAsync(stepData);
      if (isValid.success) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    }
  }, [isLastStep, currentStep, form]);

  const goToPreviousStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSubmit = useCallback((data: FormData) => {
    console.log("Form submitted:", data);
  }, []);

  const isCurrentStepValid = useCallback(() => {
    if (!currentStep) {
      return false;
    }

    const stepSchema = createStepSchema(currentStep.fields);
    const stepData: Record<string, string> = {};

    for (const field of currentStep.fields) {
      stepData[field.id] = form.getValues(field.id as keyof FormData) || "";
    }

    return stepSchema.safeParse(stepData).success;
  }, [currentStep, form]);

  const renderField = useCallback(
    (field: FormField) => {
      return (
        <GlassFormField
          control={form.control}
          key={field.id}
          name={field.id as keyof FormData}
          render={({ field: formField }) => (
            <GlassFormItem>
              <GlassFormLabel className="font-medium text-sm">
                {field.label}
              </GlassFormLabel>
              <GlassFormControl>
                {field.type === "textarea" ? (
                  <GlassTextarea
                    className="min-h-[80px] resize-none"
                    placeholder={field.placeholder}
                    {...formField}
                  />
                ) : (
                  <GlassInput
                    placeholder={field.placeholder}
                    type={field.type}
                    {...formField}
                  />
                )}
              </GlassFormControl>
              <GlassFormMessage />
            </GlassFormItem>
          )}
        />
      );
    },
    [form.control]
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
        <GlassForm {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FadeScrollView
              className="h-full min-h-0 flex-1 px-3 py-6 pt-14"
              fadeSize={32}
            >
              <div className="space-y-4">
                <div className="space-y-2 px-2">
                  <h2 className="font-semibold text-xl">
                    {currentStep?.title}
                  </h2>
                  {currentStep?.description && (
                    <p className="text-foreground/60 text-sm">
                      {currentStep?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {currentStep?.fields.map(renderField)}
                </div>
              </div>
            </FadeScrollView>

            <div className="glass3d absolute right-3 bottom-3 flex justify-end gap-1 rounded-full p-1 backdrop-blur-xs">
              {!isFirstStep && (
                <Button
                  className="rounded-full"
                  onClick={goToPreviousStep}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
              )}

              {isLastStep ? (
                <Button
                  className="gap-1 rounded-full"
                  disabled={!isCurrentStepValid()}
                  size="sm"
                  type="submit"
                >
                  Submit
                </Button>
              ) : (
                <Button
                  className="rounded-full"
                  disabled={!isCurrentStepValid()}
                  onClick={goToNextStep}
                  size="sm"
                  type="button"
                >
                  Next
                </Button>
              )}
            </div>
          </form>
        </GlassForm>
      </div>
    </Window>
  );
}
