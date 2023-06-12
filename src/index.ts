const inspectSymbol = Symbol('mock');
const noReturnValue = Symbol('noReturnValue');
const noPropValue = Symbol('noPropValue');

type CallArgs = any[];

type Instance = any;

type Inspector = Readonly<{
  withReturn: (value: any) => Inspector;
  returnMock: () => Inspector;
  resetCalls: () => Inspector;
  accessed: (prop: string) => boolean;
  returnAllPropsAs: (value: any) => Inspector;
  get called(): boolean;
  get calls(): CallArgs[];
  get instances(): Instance[];
}>;

type Magic = Record<string, any>;

export default class MagicMock implements Magic {
  private calls: CallArgs[] = [];

  private instances: Instance[] = [];

  private returnValue?: typeof noReturnValue | any = [];

  private props: Record<string, any> = {};

  private allPropsValue: typeof noPropValue | any = noPropValue;

  private [inspectSymbol]: Inspector; // technically only for TS ¯\_(ツ)_/¯

  constructor() {
    this[inspectSymbol] = this.makeInspector();

    // eslint-disable-next-line prefer-arrow-callback
    return new Proxy(function () {} as unknown as MagicMock, {
      get: (target, prop: string | typeof inspectSymbol): any => {
        if (prop === inspectSymbol) {
          return this[inspectSymbol];
        }

        if (!(prop in this.props)) {
          this.props[prop] = this.allPropsValue === noPropValue ? new MagicMock() : this.allPropsValue;
        }
        return this.props[prop];
      },
      set: (target, prop: string, newValue): boolean => {
        this.props[prop] = newValue;
        return true;
      },
      apply: (target, thisArg, args): MagicMock | any => {
        this.calls.push(args);

        return this.returnValue === noReturnValue ? new MagicMock() : this.returnValue;
      },
      construct: (target, args): MagicMock | any => {
        this.calls.push(args);

        const instance = this.returnValue === noReturnValue ? new MagicMock() : this.returnValue;
        this.instances.push(instance);

        return instance;
      },
    });
  }

  public static inspect(mock: MagicMock): Inspector {
    return mock[inspectSymbol];
  }

  private makeInspector() {
    const inspector = {
      withReturn: (value: any): Inspector => {
        this.returnValue = value;
        return inspector;
      },
      returnMock: (): Inspector => {
        this.returnValue = noReturnValue;
        return inspector;
      },
      resetCalls: (): Inspector => {
        this.calls = [];
        return inspector;
      },
      accessed: (prop: string): boolean => prop in this.props,
      returnAllPropsAs: (value: any): Inspector => {
        this.allPropsValue = value;
        return inspector;
      },
    } as Inspector;
    Object.defineProperty(inspector, 'called', {
      configurable: false,
      enumerable: true,
      get: () => !!this.calls.length,
    });
    Object.defineProperty(inspector, 'calls', {
      configurable: false,
      enumerable: true,
      get: () => this.calls,
    });
    Object.defineProperty(inspector, 'instances', {
      configurable: false,
      enumerable: true,
      get: () => this.instances,
    });
    Object.freeze(inspector);

    return inspector;
  }
}
