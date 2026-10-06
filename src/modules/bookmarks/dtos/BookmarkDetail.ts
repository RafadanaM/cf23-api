import { t } from 'elysia';

const BookmarkDetailSchema = t.Object({
  isComplete: t.Boolean(),
  id: t.String(),
  note: t.String({
    maxLength: 350,
    error: 'note cannot exceed 350 characters, check your bookmarked circle notes!'
  })
});

export default BookmarkDetailSchema;
