if (typeof String.prototype.replaceAll !== "function") {
  Object.defineProperty(String.prototype, "replaceAll", {
    configurable: true,
    writable: true,
    value(this: string, searchValue: string | RegExp, replaceValue: string) {
      const source = String(this);

      if (searchValue instanceof RegExp) {
        if (!searchValue.global) {
          throw new TypeError("replaceAll requires a global regular expression");
        }
        return source.replace(searchValue, replaceValue);
      }

      return source.split(String(searchValue)).join(replaceValue);
    },
  });
}

if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value() {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
    },
  });
}
