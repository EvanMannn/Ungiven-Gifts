// shadcn's Calendar for react-day-picker v9, trimmed to what we use (single dates, no
// month/year dropdowns or ranges). Styling comes from the theme tokens like every other component.
import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { type DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-3 [--cell-size:--spacing(8)] in-data-[slot=popover-content]:bg-transparent",
        className
      )}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4", defaults.months),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaults.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaults.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaults.button_next
        ),
        month_caption: cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", defaults.month_caption),
        caption_label: cn("text-sm font-medium select-none", defaults.caption_label),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn("flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none", defaults.weekday),
        week: cn("mt-2 flex w-full", defaults.week),
        day: cn("group/day relative aspect-square h-full w-full p-0 text-center select-none", defaults.day),
        today: cn("rounded-md bg-accent text-accent-foreground", defaults.today),
        outside: cn("text-muted-foreground aria-selected:text-muted-foreground", defaults.outside),
        disabled: cn("text-muted-foreground opacity-50", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ className, orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          ) : (
            <ChevronRightIcon className={cn("size-4", className)} {...props} />
          ),
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const defaults = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)

  // Arrow-key navigation moves the "focused" day; keep real browser focus in step with it.
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers.selected}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
        defaults.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
