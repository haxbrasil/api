export type FilePersistenceError = {
  type: 'file_persistence_error';
  cause: unknown;
  code?: string;
};
