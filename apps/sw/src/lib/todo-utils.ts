export interface TodoItem {
  text: string;
  completed: boolean;
  level: number;
  children: TodoItem[];
  id: string;
}

const todoRegex = /^(\s*)-\s*\[([ x])\]\s*(.+)$/;

export const sampleTodoMarkdown = `
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

export function parseTodos(markdown: string): TodoItem[] {
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

export function getAllTodos(items: TodoItem[]): TodoItem[] {
  return items.reduce((acc, item) => {
    acc.push(item);
    acc.push(...getAllTodos(item.children));
    return acc;
  }, [] as TodoItem[]);
}

export function getAllTodoIds(items: TodoItem[]): string[] {
  return items.reduce((acc, item) => {
    if (item.children.length > 0) {
      acc.push(item.id);
      acc.push(...getAllTodoIds(item.children));
    }
    return acc;
  }, [] as string[]);
}

export function updateTodos(
  items: TodoItem[],
  targetId: string,
  updates: Partial<TodoItem>
): TodoItem[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return { ...item, ...updates };
    }
    if (item.children.length > 0) {
      return {
        ...item,
        children: updateTodos(item.children, targetId, updates),
      };
    }
    return item;
  });
}

export function markAllComplete(items: TodoItem[]): TodoItem[] {
  return items.map((item) => ({
    ...item,
    completed: true,
    children: markAllComplete(item.children),
  }));
}
