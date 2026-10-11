import { act } from "react";
import { create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const testState = vi.hoisted(() => ({
  auth: {
    getToken: vi.fn(),
    isLoaded: false,
    isSignedIn: false,
    userId: null as string | null,
  },
  removeRelayEnvironments: vi.fn(async () => ({ _tag: "Success" })),
}));

vi.mock("@clerk/react", () => ({ useAuth: () => testState.auth }));
vi.mock("../state/use-atom-command", () => ({
  useAtomCommand: () => testState.removeRelayEnvironments,
}));
vi.mock("../lib/runtime", () => ({
  runtime: { runPromiseExit: vi.fn(async () => ({ _tag: "Success" })) },
}));
vi.mock("../connection/catalog", () => ({
  environmentCatalog: { removeRelayEnvironments: {} },
}));

import { ManagedRelayAuthProvider } from "./managedAuth";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(renderer: ReturnType<typeof create> | null) {
  const element = <ManagedRelayAuthProvider>{null}</ManagedRelayAuthProvider>;
  if (renderer) {
    await act(async () => renderer.update(element));
    return renderer;
  }
  let created!: ReturnType<typeof create>;
  await act(async () => {
    created = create(element);
  });
  return created;
}

describe("ManagedRelayAuthProvider account cleanup", () => {
  beforeEach(() => {
    testState.auth.isLoaded = false;
    testState.auth.isSignedIn = false;
    testState.auth.userId = null;
    testState.removeRelayEnvironments.mockClear();
  });

  afterEach(() => vi.clearAllMocks());

  it("keeps saved relay environments when Clerk first loads signed out", async () => {
    const renderer = await render(null);
    testState.auth.isLoaded = true;
    await render(renderer);

    expect(testState.removeRelayEnvironments).not.toHaveBeenCalled();
  });

  it("removes relay environments when a signed-in account signs out", async () => {
    const renderer = await render(null);
    testState.auth.isLoaded = true;
    testState.auth.isSignedIn = true;
    testState.auth.userId = "user-1";
    await render(renderer);
    testState.auth.isSignedIn = false;
    testState.auth.userId = null;
    await render(renderer);

    expect(testState.removeRelayEnvironments).toHaveBeenCalledTimes(1);
  });
});
