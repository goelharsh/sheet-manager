export type ColumnType =
  | "text"
  | "number"
  | "checkbox"
  | "url"
  | "date"
  | "select"
  | "multi-select"
  | "email"
  | "currency"
  | "paragraph";

export type SubmenuKey = "insertLeft" | "insertRight" | "changeColor" | "columnType";

export interface ActiveSubmenu {
  key: SubmenuKey;
  anchorY: number;
}
