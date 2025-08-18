"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import { Progress } from "@repo/ui/components/progress";
import { CheckCircle2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { useCallback, useState } from "react";
import {
  getAllTodoIds,
  getAllTodos,
  parseTodos,
  sampleTodoMarkdown,
  type TodoItem,
  updateTodos,
} from "../lib/todo-utils";
import { FadeScrollView } from "./fade-scroll-view";
import { Window } from "./window";
import { WindowToolbar } from "./window-toolbar";

function TodoItemComponent({
  item,
  depth = 0,
  onToggle,
  collapsedTodos,
  onToggleCollapse,
}: {
  item: TodoItem;
  depth?: number;
  onToggle: (id: string) => void;
  collapsedTodos: Set<string>;
  onToggleCollapse: (id: string) => void;
}) {
  const paddingLeft = depth * 24 + 8;
  const hasChildren = item.children.length > 0;
  const isOpen = !collapsedTodos.has(item.id);

  return (
    <div className="flex flex-col gap-px">
      <div className="flex items-center gap-px">
        <div
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-muted/50"
          onClick={() => onToggle(item.id)}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {item.completed ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span
            className={`font-medium text-sm leading-relaxed ${
              item.completed
                ? "text-muted-foreground line-through"
                : "text-foreground"
            }`}
          >
            {item.text}
          </span>
        </div>

        {hasChildren && (
          <CollapsibleTrigger asChild>
            <Button
              className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted/50"
              onClick={() => onToggleCollapse(item.id)}
              size="sm"
              variant="ghost"
            >
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      {hasChildren && (
        <Collapsible
          className={`${isOpen ? "visible" : "hidden"}`}
          open={isOpen}
        >
          <CollapsibleContent className="flex flex-col gap-px">
            {item.children.map((child) => (
              <TodoItemComponent
                collapsedTodos={collapsedTodos}
                depth={depth + 1}
                item={child}
                key={child.id}
                onToggle={onToggle}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function TodosWindow() {
  const [todos, setTodos] = useState(() => parseTodos(sampleTodoMarkdown));
  const [collapsedTodos, setCollapsedTodos] = useState<Set<string>>(() => {
    return new Set(getAllTodoIds(parseTodos(sampleTodoMarkdown)));
  });
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  const toggleTodo = useCallback((targetId: string) => {
    setTodos((prevTodos) => {
      const allTodos = getAllTodos(prevTodos);
      const targetTodo = allTodos.find((todo) => todo.id === targetId);
      return updateTodos(prevTodos, targetId, {
        completed: !targetTodo?.completed,
      });
    });
  }, []);

  const toggleCollapse = useCallback((todoId: string) => {
    setCollapsedTodos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        newSet.delete(todoId);
      } else {
        newSet.add(todoId);
      }
      return newSet;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedTodos(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedTodos(new Set(getAllTodoIds(todos)));
  }, [todos]);

  const allTodos = getAllTodos(todos);
  const allTodoIds = getAllTodoIds(todos);
  const completedCount = allTodos.filter((todo) => todo.completed).length;
  const totalCount = allTodos.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allExpanded =
    allTodoIds.length > 0 && allTodoIds.every((id) => !collapsedTodos.has(id));

  return (
    <Window className="p-0">
      <WindowToolbar>
        <div
          className="flex items-center justify-center gap-1 transition-all duration-300 ease-out"
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
        >
          <Progress
            className="w-20 [&>div]:rounded-full"
            value={completionPercentage}
          />
          <Badge
            className="flex h-6 items-center rounded-full font-mono"
            variant={completionPercentage === 100 ? "default" : "secondary"}
          >
            {completedCount}/{totalCount}
          </Badge>
          {allTodoIds.length > 0 && (
            <Button
              className={`h-6 overflow-hidden rounded-full px-2 text-xs transition-all duration-300 ease-out ${
                isToolbarHovered ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
              }`}
              onClick={allExpanded ? collapseAll : expandAll}
              size="sm"
              variant="ghost"
            >
              <span className="whitespace-nowrap">
                {allExpanded ? "Collapse all" : "Expand all"}
              </span>
            </Button>
          )}
        </div>
      </WindowToolbar>
      <div className="flex h-full flex-col space-y-4">
        <FadeScrollView
          className="min-h-0 flex-1 px-3 py-6 pt-14"
          fadeSize={48}
        >
          {todos.length > 0 ? (
            <div className="flex flex-col gap-px">
              {todos.map((todo) => (
                <Collapsible key={todo.id} open={!collapsedTodos.has(todo.id)}>
                  <TodoItemComponent
                    collapsedTodos={collapsedTodos}
                    depth={0}
                    item={todo}
                    onToggle={toggleTodo}
                    onToggleCollapse={toggleCollapse}
                  />
                </Collapsible>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No todos found.
            </p>
          )}
        </FadeScrollView>
      </div>
    </Window>
  );
}
