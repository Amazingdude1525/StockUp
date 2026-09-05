'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Barcode,
  Boxes,
  Check,
  ChevronRight,
  CircleCheck,
  Database,
  GitBranch,
  Map,
  MapPin,
  Menu,
  Navigation,
  PackageCheck,
  Pause,
  Play,
  Route,
  ScanLine,
  ServerCog,
  Sparkles,
  Warehouse,
  X,
  Zap,
} from 'lucide-react';
import BrandLogo from '@/components/stockup/brand-logo';
import type { AppState } from '@/lib/types';

const slides = [
  {
    image: '/stockup-poster-warehouse.png',
    eyebrow: 'Warehouse location intelligence',
    title: 'Every order finds its way.',
    description:
      'Know the stock. Choose the warehouse. Guide every pick to the exact bin.',
    meta: 'Live warehouse operations',
    tone: 'light',
  },
  {
    image: '/stockup-poster-workflow.png',
    eyebrow: 'One connected fulfilment flow',
    title: 'From order to verified pick.',
    description:
      'StockUp connects allocation, inventory reservation, indoor routing and barcode confirmation.',
    meta: 'Business workflow',
    tone: 'light',
  },
  {
    image: '/stockup-poster-system.png',
    eyebrow: 'Deterministic warehouse logic',
    title: 'Intelligence you can explain.',
    description:
      'Transactional inventory, A* pathfinding, route optimization and an immutable movement trail.',
    meta: 'System design',
    tone: 'dark',
  },
] as const;

const workflow = [
  'Order received',
  'Warehouse selected',
  'Inventory reserved',
  'Bins located',
  'Route optimized',
  'Pick verified',
  'Inventory updated',
];

export default function LandingPage({
  data,
  onExplore,
  onAdmin,
  onWorker,
}: {
  data: AppState | null;
  onExplore: () => void;
  onAdmin: () => void;
  onWorker: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  const go = (next: number) => setSlide((next + slides.length) % slides.length);
  const current = slides[slide];
  const task = data?.tasks[0];
  const naive = task?.naiveDistance ?? 86;
  const optimized = task?.optimizedDistance ?? task?.totalDistance ?? 58;
  const saved =
    task?.savingPercentage ?? Math.round((1 - optimized / naive) * 100);
  const featuredProduct = data?.products[0];
  const featuredLocation = featuredProduct?.locations[0];
  const network = useMemo(
    () =>
      data?.warehouses.slice(0, 3) ?? [
        {
          code: 'WH01',
          loadPercent: 63,
          activeOrders: 14,
          lowStock: 4,
          status: 'ONLINE',
        },
        {
          code: 'WH02',
          loadPercent: 42,
          activeOrders: 9,
          lowStock: 2,
          status: 'ONLINE',
        },
        {
          code: 'WH03',
          loadPercent: 71,
          activeOrders: 18,
          lowStock: 7,
          status: 'ONLINE',
        },
      ],
    [data],
  );

  return (
    <main className="public-landing">
      <header className="public-nav">
        <a className="public-brand" href="#top" aria-label="StockUp home">
          <BrandLogo />
        </a>
        <nav
          className={menuOpen ? 'public-links open' : 'public-links'}
          aria-label="Primary navigation"
        >
          <a href="#product" onClick={() => setMenuOpen(false)}>
            Product
          </a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#navigation" onClick={() => setMenuOpen(false)}>
            Warehouse navigation
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About
          </a>
        </nav>
        <div className="public-actions">
          <button className="nav-signin" onClick={onAdmin}>
            Sign in
          </button>
          <button className="nav-login" onClick={onWorker}>
            Warehouse login
          </button>
          <button className="nav-demo" onClick={onExplore}>
            Explore demo <ArrowUpRight size={15} />
          </button>
        </div>
        <button
          className="public-menu"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <section
        id="top"
        className={`poster-carousel ${current.tone}`}
        aria-roledescription="carousel"
        aria-label="StockUp product overview"
      >
        {slides.map((item, index) => (
          <div
            key={item.image}
            className={index === slide ? 'poster-frame active' : 'poster-frame'}
            aria-hidden={index !== slide}
          >
            {/* oxlint-disable-next-line next/no-img-element */}
            <img
              src={item.image}
              alt={index === slide ? item.description : ''}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
        <div className="poster-shade" />
        <div className="poster-content" aria-live="polite">
          <p className="landing-eyebrow">{current.eyebrow}</p>
          <h1>{current.title}</h1>
          <p className="poster-description">{current.description}</p>
          <div className="poster-cta">
            <button className="primary-cta" onClick={onExplore}>
              Explore live demo <ArrowRight size={18} />
            </button>
            <button className="secondary-cta" onClick={onWorker}>
              Warehouse login
            </button>
          </div>
        </div>
        <div className="poster-controls">
          <span>{String(slide + 1).padStart(2, '0')} / 03</span>
          <div
            className="poster-dots"
            role="tablist"
            aria-label="Choose poster"
          >
            {slides.map((item, index) => (
              <button
                key={item.meta}
                role="tab"
                aria-selected={index === slide}
                aria-label={`Show ${item.meta} poster`}
                onClick={() => go(index)}
              />
            ))}
          </div>
          <button aria-label="Previous poster" onClick={() => go(slide - 1)}>
            <ArrowLeft />
          </button>
          <button aria-label="Next poster" onClick={() => go(slide + 1)}>
            <ArrowRight />
          </button>
          <button
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play /> : <Pause />}
          </button>
        </div>
        <div className="poster-progress" key={slide} />
      </section>

      <div className="landing-proof" aria-label="StockUp platform summary">
        <span>
          <b>{data?.warehouses.length ?? 3}</b> Warehouses
        </span>
        <span>
          <b>500+</b> Demo SKUs
        </span>
        <span>
          <MapPin size={16} /> Location-level inventory
        </span>
        <span>
          <Route size={16} /> Live pick routing
        </span>
      </div>

      <section className="landing-section product-intro" id="product">
        <div className="section-heading narrow">
          <p className="landing-eyebrow">
            Warehouse location & fulfilment intelligence
          </p>
          <h2>Know the stock. Choose the warehouse. Guide the pick.</h2>
          <p>
            Track inventory down to the exact bin, intelligently assign incoming
            orders and guide teams through optimized indoor routes.
          </p>
        </div>
        <OperationalExplainer network={network} />
      </section>

      <section className="landing-section problem-section">
        <div className="section-heading">
          <p className="landing-eyebrow">The operational gap</p>
          <h2>
            Inventory software tells you what you have. StockUp tells your team
            where to go.
          </h2>
        </div>
        <div className="problem-grid">
          <FlowColumn
            title="Without StockUp"
            muted
            steps={[
              'Order',
              'Search manually',
              'Find warehouse',
              'Find row',
              'Find bin',
              'Walk manually',
              'Risk wrong pick',
            ]}
          />
          <FlowColumn
            title="With StockUp"
            steps={[
              'Order',
              'Warehouse selected',
              'Inventory reserved',
              'Bins resolved',
              'Route generated',
              'Pick verified',
            ]}
          />
        </div>
      </section>

      <section className="landing-section capability-stack">
        <article className="capability-row">
          <div className="capability-copy">
            <span className="step-label">01 · Know</span>
            <h2>Every SKU. Every warehouse. Every row. Every bin.</h2>
            <p>
              Availability becomes actionable when every unit resolves to a
              physical pick location.
            </p>
            <button className="text-cta" onClick={onAdmin}>
              Search inventory <ChevronRight size={16} />
            </button>
          </div>
          <div className="inventory-demo visual-card">
            <div className="item-avatar">
              <Boxes />
            </div>
            <div>
              <small>Product</small>
              <h3>{featuredProduct?.name ?? 'Coca-Cola 750ml'}</h3>
              <p>{featuredProduct?.sku ?? 'SKU-CC-750'}</p>
            </div>
            <dl>
              <div>
                <dt>Warehouse</dt>
                <dd>{featuredLocation?.warehouseCode ?? 'WH02'}</dd>
              </div>
              <div>
                <dt>Row</dt>
                <dd>{featuredLocation?.rowCode ?? 'R03'}</dd>
              </div>
              <div>
                <dt>Bin</dt>
                <dd>{featuredLocation?.binCode ?? 'B014'}</dd>
              </div>
            </dl>
            <div className="stock-numbers">
              <span>
                <small>On hand</small>
                <b>{featuredLocation?.onHand ?? 31}</b>
              </span>
              <span>
                <small>Reserved</small>
                <b>{featuredLocation?.reserved ?? 6}</b>
              </span>
              <span className="available">
                <small>Available</small>
                <b>{featuredLocation?.available ?? 25}</b>
              </span>
            </div>
          </div>
        </article>

        <article className="capability-row reverse">
          <div className="capability-copy">
            <span className="step-label">02 · Decide</span>
            <h2>Choose the best warehouse automatically.</h2>
            <p>
              Score whole-order coverage, current load and route readiness
              before reserving stock.
            </p>
          </div>
          <div className="allocation-demo visual-card">
            {[
              ['WH01', '83%', '54%', false],
              ['WH02', '100%', '42%', true],
              ['WH03', '67%', '71%', false],
            ].map(([code, coverage, load, selected]) => (
              <div
                className={
                  selected ? 'allocation-row selected' : 'allocation-row'
                }
                key={String(code)}
              >
                <Warehouse size={19} />
                <b>{code}</b>
                <span>{coverage} coverage</span>
                <span>{load} load</span>
                {selected && (
                  <em>
                    <Check size={13} /> Selected
                  </em>
                )}
              </div>
            ))}
            <div className="selection-reason">
              <b>Why WH02?</b>
              <span>
                <CircleCheck /> All items available
              </span>
              <span>
                <CircleCheck /> No split required
              </span>
              <span>
                <CircleCheck /> Lower current load
              </span>
              <span>
                <CircleCheck /> Optimized route ready
              </span>
            </div>
          </div>
        </article>

        <article className="capability-row" id="navigation">
          <div className="capability-copy">
            <span className="step-label">03 · Navigate</span>
            <h2>Turn picking into navigation.</h2>
            <p>
              A* resolves walkable paths while route optimization sequences
              stops into a shorter, explainable journey.
            </p>
            <div className="route-results">
              <span>
                Naive route <b>{naive}m</b>
              </span>
              <span>
                Optimized <b>{optimized}m</b>
              </span>
              <span>
                Distance saved <b>{saved}%</b>
              </span>
            </div>
          </div>
          <WarehouseRouteMap />
        </article>
      </section>

      <section className="landing-section network-section">
        <div className="section-heading split-heading">
          <div>
            <p className="landing-eyebrow">Network intelligence</p>
            <h2>Three warehouses. One operational view.</h2>
          </div>
          <p>
            See load, active orders and risk in one place. Open any warehouse to
            move from network context to its live internal layout.
          </p>
        </div>
        <div className="network-board">
          <div className="network-lines" aria-hidden="true" />
          {network.map((item, index) => (
            <button
              className={`network-node node-${index + 1}`}
              key={item.code}
              onClick={onAdmin}
            >
              <span>
                <Warehouse />
              </span>
              <b>{item.code}</b>
              <small>{item.status}</small>
              <dl>
                <div>
                  <dt>Load</dt>
                  <dd>{item.loadPercent}%</dd>
                </div>
                <div>
                  <dt>Orders</dt>
                  <dd>{item.activeOrders}</dd>
                </div>
                <div>
                  <dt>Low stock</dt>
                  <dd>{item.lowStock}</dd>
                </div>
              </dl>
            </button>
          ))}
          <div className="network-center">
            <Map size={22} />
            <span>StockUp network</span>
          </div>
        </div>
      </section>

      <section className="landing-section worker-section">
        <div className="worker-copy">
          <p className="landing-eyebrow">Worker experience</p>
          <h2>The next pick should never be a guessing game.</h2>
          <p>
            Clear row and bin instructions, barcode verification and automatic
            rerouting keep warehouse teams moving.
          </p>
          <ul>
            <li>
              <Navigation /> Route navigation
            </li>
            <li>
              <PackageCheck /> Pick progress
            </li>
            <li>
              <Barcode /> Barcode verification
            </li>
            <li>
              <GitBranch /> Automatic rerouting
            </li>
          </ul>
          <button className="primary-cta" onClick={onWorker}>
            Open worker panel <ArrowRight />
          </button>
        </div>
        <div className="worker-phone">
          <div className="phone-top">
            <span>WH02 · PICK 03/06</span>
            <ScanLine />
          </div>
          <small>Next pick</small>
          <h3>Coca-Cola 750ml ×2</h3>
          <div className="phone-location">
            <span>
              <small>Row</small>
              <b>03</b>
            </span>
            <span>
              <small>Bin</small>
              <b>B14</b>
            </span>
            <span>
              <small>Distance</small>
              <b>16m</b>
            </span>
          </div>
          <div className="mini-route">
            <i />
            <i />
            <i />
            <i className="active" />
          </div>
          <button>Confirm pick</button>
          <button className="missing">Item not found</button>
        </div>
      </section>

      <section className="landing-section audit-section">
        <div className="section-heading split-heading">
          <div>
            <p className="landing-eyebrow">Movement ledger</p>
            <h2>Every movement leaves a trail.</h2>
          </div>
          <p>
            Transactional history connects every inward, outward, transfer and
            adjustment to a location, order and employee.
          </p>
        </div>
        <div className="ledger-card">
          {[
            ['OUTWARD', 'Coca-Cola 750ml', '-2', 'R03-B14', 'EMP-1042'],
            ['TRANSFER', 'Milk 1L', '+10', 'R01-B04 → R02-B08', 'ADMIN100'],
            ['INWARD', 'Bread', '+20', 'R03-B11', 'EMP-1038'],
          ].map((entry) => (
            <div className="ledger-row" key={entry.join('-')}>
              <span className={`movement-type ${entry[0].toLowerCase()}`}>
                {entry[0]}
              </span>
              <b>{entry[1]}</b>
              <strong>{entry[2]}</strong>
              <span>{entry[3]}</span>
              <small>{entry[4]}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section intelligence-section">
        <div className="section-heading narrow">
          <p className="landing-eyebrow">Operational intelligence</p>
          <h2>Built to improve warehouse movement.</h2>
        </div>
        <div className="intelligence-grid">
          <Insight
            icon={<Sparkles />}
            title="Adaptive slotting"
            text="Recommend better bins using pick frequency and travel distance."
          />
          <Insight
            icon={<Zap />}
            title="Replenishment"
            text="Identify stockout risk and recommend network transfers."
          />
          <Insight
            icon={<Route />}
            title="Pick waves"
            text="Batch nearby orders into efficient multi-order routes."
          />
          <Insight
            icon={<Warehouse />}
            title="Warehouse allocation"
            text="Choose the location that best serves the whole order."
          />
        </div>
      </section>

      <section className="landing-section how-section" id="how-it-works">
        <div className="section-heading narrow">
          <p className="landing-eyebrow">How StockUp works</p>
          <h2>One deterministic flow from checkout to check-in.</h2>
        </div>
        <ol className="workflow-line">
          {workflow.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <b>{step}</b>
              {index < workflow.length - 1 && <ChevronRight />}
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section engineering-section">
        <div className="engineering-copy">
          <p className="landing-eyebrow">Engineering</p>
          <h2>Built around deterministic warehouse logic.</h2>
          <p>
            Every recommendation has a reason. Every mutation preserves
            inventory integrity.
          </p>
        </div>
        <div className="engineering-grid">
          <Tech icon={<Route />} title="A*" text="Indoor pathfinding" />
          <Tech
            icon={<Database />}
            title="SQL"
            text="Transactional inventory"
          />
          <Tech icon={<Zap />} title="Realtime" text="Warehouse updates" />
          <Tech icon={<Barcode />} title="Barcode" text="Pick verification" />
          <Tech icon={<ServerCog />} title="2-opt" text="Route optimization" />
        </div>
      </section>

      <section className="landing-section hackathon-section" id="about">
        <div>
          <p className="landing-eyebrow">Platform Architecture</p>
          <h2>Built for PS-3 Specification Compliance.</h2>
          <p>
            StockUp was engineered for{' '}
            <b>
              E-Commerce Multi-Warehouse Inventory & Location Tracking System
            </b>
            .
          </p>
          <span>Category · Pure Hard Development</span>
        </div>
        <div className="team-card">
          <small>Engineered by</small>
          <div>
            <b>Prateek Das</b>
            <span>25BCE10599</span>
          </div>
          <div>
            <b>Anushka Chatterjee</b>
            <span>25BCE11276</span>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <p className="landing-eyebrow">Inventory in motion</p>
        <h2>
          From checkout to check-in,
          <br />
          know the next move.
        </h2>
        <div>
          <button className="primary-cta" onClick={onExplore}>
            Explore StockUp <ArrowRight />
          </button>
          <button className="secondary-cta" onClick={onWorker}>
            Warehouse login
          </button>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-brand">
          <BrandLogo />
          <p>Warehouse Location & Fulfilment Intelligence</p>
        </div>
        <div>
          <b>Product</b>
          <button onClick={onAdmin}>Network map</button>
          <a href="#navigation">Warehouse navigation</a>
          <button onClick={onAdmin}>Inventory</button>
          <button onClick={onAdmin}>Orders</button>
        </div>
        <div>
          <b>Company</b>
          <a href="#about">About</a>
          <b className="footer-sub">Legal</b>
          <span>Terms of service</span>
        </div>
        <div>
          <b>Demo</b>
          <button onClick={onExplore}>Customer demo</button>
          <button onClick={onWorker}>Warehouse login</button>
        </div>
        <p className="footer-credit">
          StockUp — Multi-Warehouse Fulfillment OS · Developed by Prateek Das (25BCE10599) & Anushka
          Chatterjee (25BCE11276)
        </p>
      </footer>
    </main>
  );
}

function OperationalExplainer({
  network,
}: {
  network: Array<{ code: string; loadPercent: number }>;
}) {
  return (
    <div className="operational-explainer">
      <div className="order-card">
        <span>Incoming order</span>
        <h3>ORD-1058</h3>
        <p>6 products</p>
        <div className="coverage-list">
          {network.map((item, index) => (
            <div className={index === 1 ? 'selected' : ''} key={item.code}>
              <Warehouse />
              <b>{item.code}</b>
              <span>
                {index === 1 ? '6/6' : index === 0 ? '5/6' : '4/6'} available
              </span>
              {index === 1 && <em>Selected</em>}
            </div>
          ))}
        </div>
      </div>
      <div className="flow-connector">
        <span />
        <ArrowRight />
      </div>
      <WarehouseRouteMap compact />
      <div className="next-pick-card">
        <small>Next pick</small>
        <b>Coca-Cola 750ml ×2</b>
        <span>R3 · B14</span>
        <em>16m</em>
      </div>
    </div>
  );
}

function WarehouseRouteMap({ compact = false }: { compact?: boolean }) {
  return (
    <figure
      className={
        compact
          ? 'warehouse-route-map compact'
          : 'warehouse-route-map visual-card'
      }
      aria-label="Optimized warehouse route from check-in through four pick stops"
    >
      <div className="map-title">
        <span>Warehouse map</span>
        <b>WH02 · CP02</b>
      </div>
      <div className="aisle-grid">
        {[1, 2, 3, 4].map((row) => (
          <div className="aisle" key={row}>
            <span>R{row}</span>
            {[1, 2, 3, 4, 5].map((bin) => (
              <i key={bin} />
            ))}
          </div>
        ))}
      </div>
      <svg
        viewBox="0 0 600 300"
        aria-label="Blue optimized route with four numbered stops"
      >
        <path d="M62 260 C110 230 92 182 150 178 S228 212 265 156 S340 90 390 112 S442 190 520 76" />
        {[
          ['62', '260', 'CP'],
          ['150', '178', '1'],
          ['265', '156', '2'],
          ['390', '112', '3'],
          ['520', '76', '4'],
        ].map(([cx, cy, label]) => (
          <g key={label}>
            <circle cx={cx} cy={cy} r="14" />
            <text x={cx} y={String(Number(cy) + 5)}>
              {label}
            </text>
          </g>
        ))}
      </svg>
      <div className="map-legend">
        <span>
          <i /> Optimized route
        </span>
        <b>4 stops</b>
      </div>
    </figure>
  );
}

function FlowColumn({
  title,
  steps,
  muted = false,
}: {
  title: string;
  steps: string[];
  muted?: boolean;
}) {
  return (
    <article className={muted ? 'flow-column muted' : 'flow-column'}>
      <h3>{title}</h3>
      {steps.map((step, index) => (
        <div key={step}>
          <span>{muted ? index + 1 : <Check />}</span>
          <b>{step}</b>
          {index < steps.length - 1 && <ArrowDown />}
        </div>
      ))}
    </article>
  );
}

function Insight({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <ChevronRight />
    </article>
  );
}

function Tech({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{text}</small>
      </div>
    </article>
  );
}
