import { TodoItem } from '../types/habit';
import { addDaysToDateKey, compareDateKeys, formatFriendlyDate, getTodayKey } from './date';

export type TodoBucketId = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later' | 'no-date';

export type TodoBucket = {
  id: TodoBucketId;
  title: string;
  todos: TodoItem[];
};

function dueSortValue(todo: TodoItem) {
  if (!todo.dueDateKey) {
    return '9999-99-99 99:99';
  }
  return `${todo.dueDateKey} ${todo.dueTime ?? '23:59'}`;
}

export function compareTodosSmart(left: TodoItem, right: TodoItem) {
  const dueComparison = dueSortValue(left).localeCompare(dueSortValue(right));
  if (dueComparison !== 0) {
    return dueComparison;
  }
  return left.order - right.order;
}

export function buildTodoBuckets(todos: TodoItem[]): TodoBucket[] {
  const todayKey = getTodayKey();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const nextWeekKey = addDaysToDateKey(todayKey, 7);
  const bucketMap: Record<TodoBucketId, TodoItem[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    soon: [],
    later: [],
    'no-date': [],
  };

  for (const todo of todos.filter((item) => item.completedAt === null)) {
    if (!todo.dueDateKey) {
      bucketMap['no-date'].push(todo);
    } else if (isTodoOverdue(todo)) {
      bucketMap.overdue.push(todo);
    } else if (todo.dueDateKey === todayKey) {
      bucketMap.today.push(todo);
    } else if (todo.dueDateKey === tomorrowKey) {
      bucketMap.tomorrow.push(todo);
    } else if (compareDateKeys(todo.dueDateKey, nextWeekKey) <= 0) {
      bucketMap.soon.push(todo);
    } else {
      bucketMap.later.push(todo);
    }
  }

  const definitions: Array<[TodoBucketId, string]> = [
    ['overdue', '已逾期'],
    ['today', '今天'],
    ['tomorrow', '明天'],
    ['soon', '未来 7 天'],
    ['later', '稍后'],
    ['no-date', '无日期'],
  ];

  return definitions
    .map(([id, title]) => ({ id, title, todos: bucketMap[id].sort(compareTodosSmart) }))
    .filter((bucket) => bucket.todos.length > 0);
}

export function formatTodoDue(todo: TodoItem) {
  if (!todo.dueDateKey) {
    return '无截止时间';
  }
  return `${formatFriendlyDate(todo.dueDateKey)}${todo.dueTime ? ` ${todo.dueTime}` : ''}`;
}

export function isTodoOverdue(todo: TodoItem) {
  if (!todo.dueDateKey) {
    return false;
  }
  const todayKey = getTodayKey();
  const dateComparison = compareDateKeys(todo.dueDateKey, todayKey);
  if (dateComparison < 0) {
    return true;
  }
  if (dateComparison > 0 || !todo.dueTime) {
    return false;
  }
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return todo.dueTime < currentTime;
}
