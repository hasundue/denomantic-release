import { format } from "https://deno.land/std@0.201.0/semver/mod.ts";
import { assertEquals } from "https://deno.land/std@0.201.0/testing/asserts.ts";
import { bumpSemVer } from "./mod.ts";

const test = (before: string, types: string[], after: string) =>
  Deno.test(`${before} + ${types} -> ${after}`, () =>
    assertEquals(
      format(bumpSemVer(before, types)),
      after,
    ));

test("0.1.0", ["chore"], "0.1.0");
test("0.1.0", ["fix"], "0.1.1");
test("0.1.0", ["feat"], "0.2.0");
test("0.1.0", ["fix", "feat"], "0.2.0");
test("0.1.0", ["BREAKING"], "0.2.0");

test("1.1.0", ["chore"], "1.1.0");
test("1.1.0", ["fix"], "1.1.1");
test("1.1.0", ["feat"], "1.2.0");
test("1.1.0", ["fix", "feat"], "1.2.0");
test("1.1.0", ["BREAKING"], "2.0.0");
