export const ID = Symbol('ID');

export interface IdPort {
  generate(): string;
}
