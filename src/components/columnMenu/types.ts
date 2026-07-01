export type ColumnType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "url"
  | "email"
  | "image"
  | "checkbox"
  | "select"
  | "multi-select"
  | "assigned-to"
  | "paragraph";

export type SubmenuKey = "insertLeft" | "insertRight" | "changeColor" | "columnType";

export interface ActiveSubmenu {
  key: SubmenuKey;
  anchorY: number;
}
