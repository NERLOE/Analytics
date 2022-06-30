import { Website } from "@prisma/client";
import { prisma } from "@server/db/client";
import { trpc } from "@utils/trpc";
import {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { authOptions } from "./api/auth/[...nextauth]";

interface Props {
  website: Website;
}

const AnalyticsPage: NextPage<Props> = () => {
  const router = useRouter();

  const { data: website } = trpc.useQuery([
    "analytics.getWebsite",
    {
      domain: router.query.domain as string,
    },
  ]);

  if (!website) return null;

  const { data: visits } = trpc.useQuery([
    "analytics.getVisits",
    { websiteId: website.id },
  ]);

  if (!visits) return null;

  console.log(visits);

  return (
    <div>
      <p className="text-center font-extrabold text-7xl text-white">
        {website.domain}
      </p>
      {visits.map((visit) => {
        return (
          <p key={visit.path} className="text-slate-300">
            <a target={"_blank"} rel="noreferrer" href={visit.url}>
              {visit.path}:
            </a>{" "}
            {visit._count.id}
          </p>
        );
      })}
    </div>
  );
};

export async function getServerSideProps(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Props>> {
  const { domain } = context.query;

  if (typeof domain == "string") {
    const website = await prisma.website.findFirst({
      where: { domain: domain },
    });

    if (website) {
      const session = await getServerSession(
        context.req,
        context.res,
        authOptions
      );

      if (
        website.ownerId != session?.user.id &&
        process.env.NODE_ENV === "production"
      ) {
        return {
          notFound: true,
        };
      }

      return {
        props: {
          website: website,
        },
      };
    }
  }

  return {
    notFound: true,
  };
}

export default AnalyticsPage;
