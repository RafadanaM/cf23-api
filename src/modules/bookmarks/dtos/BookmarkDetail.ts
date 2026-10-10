import { t } from 'elysia';

const BookmarkDetailSchema = t.Object({
  isComplete: t.Boolean(),
  id: t.String(),
  note: t.String({
    maxLength: 250,
    error: 'note cannot exceed 250 characters, check your bookmarked circle notes!'
  })
});

export default BookmarkDetailSchema;
