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
import { Window } from "./window";
import { WindowToolbar } from "./window-toolbar";

interface TodoItem {
  text: string;
  completed: boolean;
  level: number;
  children: TodoItem[];
  id: string;
}

const sampleMarkdown = `
- [ ] User Authentication System
  - [x] Design login page
  - [x] Implement JWT tokens
  - [ ] Add password reset
    - [x] Email template
    - [ ] Reset flow
    - [ ] Security validation
  - [ ] Social login integration
    - [ ] Google OAuth
    - [ ] GitHub OAuth

- [x] Database Setup
  - [x] Choose database (PostgreSQL)
  - [x] Set up migrations
  - [x] Create user table
  - [x] Create posts table

- [ ] API Development
  - [x] Set up Express server
  - [ ] User endpoints
    - [x] POST /api/users/register
    - [x] POST /api/users/login
    - [ ] GET /api/users/profile
    - [ ] PUT /api/users/profile
  - [ ] Post endpoints
    - [ ] GET /api/posts
    - [ ] POST /api/posts
    - [ ] PUT /api/posts/:id
    - [ ] DELETE /api/posts/:id

- [ ] Frontend Components
  - [ ] Header component
  - [ ] Navigation menu
  - [ ] User profile page
    - [ ] Profile form
    - [ ] Avatar upload
    - [ ] Settings panel
      - [ ] Privacy settings
      - [ ] Notification preferences
        - [ ] Email notifications
        - [ ] Push notifications
        - [ ] SMS notifications
`;

const todoRegex = /^(\s*)-\s*\[([ x])\]\s*(.+)$/;

function parseTodos(markdown: string): TodoItem[] {
  const lines = markdown.split("\n");
  const todos: TodoItem[] = [];
  const stack: TodoItem[] = [];
  let idCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const todoMatch = line.match(todoRegex);
    if (!todoMatch) {
      continue;
    }

    const [, indent, status, text] = todoMatch;
    const level = Math.floor(indent?.length ?? 0 / 2);
    const completed = status?.toLowerCase() === "x";

    const todo: TodoItem = {
      text: text?.trim() ?? "",
      completed,
      level,
      children: [],
      id: `todo-${idCounter++}`,
    };

    while ((stack.length > 0 && stack.at(-1)?.level) ?? level <= 0) {
      stack.pop();
    }

    if (stack.length === 0) {
      todos.push(todo);
    } else {
      stack.at(-1)?.children.push(todo);
    }

    stack.push(todo);
  }

  return todos;
}

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
  const [todos, setTodos] = useState(() => parseTodos(sampleMarkdown));
  const [collapsedTodos, setCollapsedTodos] = useState<Set<string>>(() => {
    const initialTodos = parseTodos(sampleMarkdown);
    const getAllTodosWithChildren = (items: TodoItem[]): string[] => {
      return items.reduce((acc, item) => {
        if (item.children.length > 0) {
          acc.push(item.id);
          acc.push(...getAllTodosWithChildren(item.children));
        }
        return acc;
      }, [] as string[]);
    };
    return new Set(getAllTodosWithChildren(initialTodos));
  });
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  const toggleTodo = useCallback((targetId: string) => {
    const updateTodos = (items: TodoItem[]): TodoItem[] => {
      return items.map((item) => {
        if (item.id === targetId) {
          return { ...item, completed: !item.completed };
        }
        if (item.children.length > 0) {
          return { ...item, children: updateTodos(item.children) };
        }
        return item;
      });
    };
    setTodos((prevTodos) => updateTodos(prevTodos));
  }, []);

  const _resetTodos = useCallback(() => {
    setTodos(parseTodos(sampleMarkdown));
  }, []);

  const _completeAllTodos = useCallback(() => {
    const markAllComplete = (items: TodoItem[]): TodoItem[] => {
      return items.map((item) => ({
        ...item,
        completed: true,
        children: markAllComplete(item.children),
      }));
    };
    setTodos((prevTodos) => markAllComplete(prevTodos));
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
    const getAllTodoIds = (items: TodoItem[]): string[] => {
      return items.reduce((acc, item) => {
        if (item.children.length > 0) {
          acc.push(item.id);
          acc.push(...getAllTodoIds(item.children));
        }
        return acc;
      }, [] as string[]);
    };
    setCollapsedTodos(new Set(getAllTodoIds(todos)));
  }, [todos]);

  const getAllTodos = (items: TodoItem[]): TodoItem[] => {
    return items.reduce((acc, item) => {
      acc.push(item);
      acc.push(...getAllTodos(item.children));
      return acc;
    }, [] as TodoItem[]);
  };

  const allTodos = getAllTodos(todos);
  const completedCount = allTodos.filter((todo) => todo.completed).length;
  const totalCount = allTodos.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getAllTodoIds = (items: TodoItem[]): string[] => {
    return items.reduce((acc, item) => {
      if (item.children.length > 0) {
        acc.push(item.id);
        acc.push(...getAllTodoIds(item.children));
      }
      return acc;
    }, [] as string[]);
  };

  const allTodoIds = getAllTodoIds(todos);
  const allExpanded =
    allTodoIds.length > 0 && allTodoIds.every((id) => !collapsedTodos.has(id));
  const _allCollapsed =
    allTodoIds.length > 0 && allTodoIds.every((id) => collapsedTodos.has(id));

  return (
    <Window>
      <WindowToolbar>
        <div
          className="mb-1 flex h-6 items-center justify-center gap-1 transition-all duration-300 ease-out"
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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
        </div>
      </div>
    </Window>
  );
}
