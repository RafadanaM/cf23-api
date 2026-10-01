import { t } from 'elysia';

import BookmarkDetailSchema from './BookmarkDetail';

const UpsertBookmarkSchema = t.Object({
  bookmark: t.Object({
    bookmarkId: t.String(),
    bookmarks: t.Record(t.String(), BookmarkDetailSchema),
    bookmarkedCircleIds: t.Array(t.String())
  })
});

export default UpsertBookmarkSchema;
