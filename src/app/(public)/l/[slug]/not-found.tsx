import PageWrap from "@/components/sticker/PageWrap";
import Empty from "@/components/sticker/Empty";
import LinkButton from "@/components/ui/LinkButton";

export default function ListNotFound() {
  return (
    <PageWrap>
      <h1 style={{ margin: 0 }}>We couldn&apos;t find that list</h1>
      <Empty sticker="gifttag" action={<LinkButton href="/" variant="contained">Back to the family page</LinkButton>}>The link may be wrong or the list may have been removed.</Empty>
    </PageWrap>
  );
}
