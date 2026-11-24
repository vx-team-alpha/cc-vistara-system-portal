const option = (id, description, current = false) => ({
  id,
  description,
  src: "",
  isCurrentOption: current,
});

const question = (id, name, consumerListOrder, options) => ({
  id,
  name,
  optionHeadingId: id,
  designComponentId: "00000000-0000-0000-0000-000000000000",
  components: [],
  members: [],
  hasText: false,
  text: "",
  validation: { maxLength: 0, maxLengthError: "", regex: "", regexError: "" },
  visibilityTypeId: 0,
  consumerListOrder,
  currentId: options[0].id,
  options,
});

// Data-only choices recovered from the Eurocell Composite frame-system catalogue.
// They run through the same question, validation, save and print pipeline as the
// existing catalogue questions; the drawing renderer intentionally ignores them.
export const eurocellProfileQuestions = [
  question("cf61628c-d1e2-5404-b420-e959d2000033", "Cylinder", 8.1, [
    option("6a84eb01-87f7-549b-8f00-0fdd4d604bb1", "Standard cylinder", true),
    option("86d6e95d-0316-5c12-8d16-c9c1b4a5ea52", "Thumbturn"),
    option("183b46f6-8c81-50a3-9a37-0d1d478df7b9", "1* Standard cylinder"),
    option("bbd68966-fddb-5e65-b0c2-7bd0a783cc75", "1* Thumbturn cylinder"),
    option("7457f495-8bb7-53e5-9c68-49e3e244375d", "3* cylinder"),
    option("898e4b1e-0fe6-53aa-8585-8c2cd0a9105e", "3* Thumbturn cylinder"),
  ]),
  question("46408c79-d0f7-5020-9232-b2473b90200e", "Key-alike", 8.2, [
    option("f7fd6fbb-7adb-57b1-9d3e-c01cc0781b8b", "None", true),
    option("179aef6b-48f8-516c-a58a-5aa22c46e0f8", "Keyed alike"),
  ]),
  question("346597c6-2881-5351-be52-a0a25787c67f", "Hinges", 8.3, [
    option("a8b639cd-b872-5d9c-910e-13d3dbdc71a3", "VBH hinges", true),
    option("2bfae1e1-e0c8-56bd-b049-42c36fc298f7", "ERA hinges"),
  ]),
  question("43a3048a-7afb-551e-af68-953f749ab653", "Restrictors", 8.4, [
    option("891e91e3-14ac-5866-9033-39d6a28bb2d6", "No restrictors", true),
    option("3d39e858-17e9-5d89-9250-897f68f77af5", "Restrictor(s) fitted"),
    option("b2f2bec4-79e9-58b6-b047-1187e2b0494e", "Cabin hook(s) fitted"),
  ]),
  question("8d3b4734-f9c7-5dd2-8331-fa5dd0f4b9c8", "Drainage", 16.1, [
    option("a6480ff7-8dfb-5cb1-9cb8-24f3d4a3b96d", "Concealed drainage", true),
    option("01190ecf-4394-53f9-8fe6-fffa38a628ee", "Face drainage"),
  ]),
];

// Data-only choices recovered from the Rehau Composite frame-system catalogue.
export const rehauProfileQuestions = [
  question("e19a4d82-c511-54bc-87fa-b514b8a4f120", "Outer frame", 14.5, [
    option("2a176e5d-4f01-52ca-b087-ce2e737c3810", "Composite outer frame", true),
    option("49d44c9b-648b-59b1-b921-6d7cfdfa3e42", "Universal outer frame"),
  ]),
  question("a2e7c381-8395-5db1-b217-19d45e7f1234", "Cylinder", 8.1, [
    option("d45f1a23-4567-5bcd-8901-23456789abcd", "High Security 3 Star Anti-Snap cylinder", true),
    option("e56a2b34-5678-5cde-9012-3456789abcde", "1 Star cylinder"),
    option("f67b3c45-6789-5def-0123-456789abcdef", "Thumbturn cylinder"),
    option("078c4d56-789a-5efa-1234-56789abcdef0", "Standard cylinder"),
  ]),
  question("b3f8d492-9406-5ec2-c328-20e56f8a2345", "Hinges", 8.3, [
    option("189d5e67-89ab-5fab-2345-6789abcdef01", "Challenger hinges", true),
    option("29ae6f78-9abc-5abc-3456-789abcdef012", "VBH hinges"),
    option("3abf7089-abcd-5bcd-4567-89abcdef0123", "ERA hinges"),
    option("4bc0819a-bcde-5cde-5678-9abcdef01234", "Flag hinges"),
  ]),
  question("c409e5a3-0517-5fd3-d439-31f6709b3456", "Locking", 8.4, [
    option("5cd192ab-cdef-5def-6789-abcdef012345", "ERA Lock", true),
    option("6de2a3bc-def0-5efa-789a-bcdef0123456", "ERA Invincible Lock"),
    option("7ef3b4cd-ef01-5fab-89ab-cdef01234567", "Hook lock"),
  ]),
  question("d51af6b4-1628-50e4-e54a-420781ac4567", "Restrictor", 8.5, [
    option("8f04c5de-f012-5abc-9abc-def012345678", "No restrictor", true),
    option("9015d6ef-0123-5bcd-abcd-ef0123456789", "Restrictor fitted"),
  ]),
  question("e62ba7c5-2739-51f5-f65b-531892bd5678", "Safe T bar", 8.6, [
    option("a126e7f0-1234-5cde-bcde-f0123456789a", "No safe T bar", true),
    option("b237f801-2345-5def-cdef-0123456789ab", "with safe T bar"),
  ]),
  question("8d3b4734-f9c7-5dd2-8331-fa5dd0f4b9c8", "Drainage", 16.1, [
    option("a6480ff7-8dfb-5cb1-9cb8-24f3d4a3b96d", "Concealed drainage", true),
    option("01190ecf-4394-53f9-8fe6-fffa38a628ee", "Face drainage"),
  ]),
];

export function profileSystemQuestions(system = "eurocell") {
  if (system === "rehau") return rehauProfileQuestions;
  return eurocellProfileQuestions;
}
