// Космическая станция - игра для хакатона Газпромбанка
// Полная перезапись без скейла с круглым туманом

const canvas = document.getElementById('mainCanvas');
// Адаптивные размеры под экран пользователя
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const ctx = canvas.getContext('2d');

const energyValEl = document.getElementById('energyVal');
const energyCapEl = document.getElementById('energyCap');
const oxyValEl = document.getElementById('oxyVal');
const energyRateEl = document.getElementById('energyRate');
const upgradeBtn = document.getElementById('upgradeBtn');
const panel = document.getElementById('panel');
const panelContent = document.getElementById('panelContent');
const closePanel = document.getElementById('closePanel');

const GAME_W = canvas.width;
const GAME_H = canvas.height;

// Система тумана войны - круглые области
const FOG_RADIUS = 80; // радиус тумана в пикселях
const WORLD_SIZE = 2000; // размер мира
const FOG_DENSITY = 0.3; // плотность тумана

// Система планет - финансовые продукты Газпромбанка
const PLANET_TYPES = {
  deposit: { name: 'Депозит "Космический"', color: '#4CAF50', energyCost: 10, energyReward: 50, icon: '💰' },
  credit: { name: 'Кредит "Звездный"', color: '#FF9800', energyCost: 15, energyReward: 75, icon: '💳' },
  investment: { name: 'Инвестиции "Галактика"', color: '#2196F3', energyCost: 20, energyReward: 100, icon: '📈' },
  insurance: { name: 'Страхование "Орбита"', color: '#9C27B0', energyCost: 25, energyReward: 125, icon: '🛡️' },
  card: { name: 'Карта "Космос"', color: '#F44336', energyCost: 12, energyReward: 60, icon: '💎' },
  mortgage: { name: 'Ипотека "Спутник"', color: '#795548', energyCost: 30, energyReward: 150, icon: '🏠' },
  business: { name: 'Бизнес "Астероид"', color: '#607D8B', energyCost: 35, energyReward: 175, icon: '🏢' },
  pension: { name: 'Пенсия "Небесная"', color: '#FFC107', energyCost: 18, energyReward: 90, icon: '👴' }
};
const PLANET_RADIUS = 40; // радиус планеты
const PLANET_SPAWN_CHANCE = 0.15; // шанс появления планеты при открытии области

// Позиция камеры
let cameraX = 0;
let cameraY = 0;

// Планета закреплена в конкретном месте на карте
const PLANET_R = 60;
const PLANET_WORLD_X = 0; // координаты планеты в мире
const PLANET_WORLD_Y = 0;
const PLANET_X = GAME_W/2; // позиция на экране (всегда центр)
const PLANET_Y = GAME_H/2;

// Орбитальный корабль
let shipAngle = 0;
const ORBIT_RADIUS = PLANET_R + 40;

// Анимация солнца
let sunAnimationTime = 0;

// Состояние игры
const DEFAULT_STATE = { 
  stationLevel: 1, 
  energy: 20, 
  boosters: [], 
  discoveredAreas: [], // массив открытых областей
  planets: [], // массив планет
  sessionCargoSpawned: false,
  totalDistance: 0,
  missionsCompleted: 0
};

// Бустеры банковских продуктов
const BANK_BOOSTERS = {
  deposit: {
    name: 'Депозит',
    description: 'Вложите энергию и получите прибыль через время',
    icon: '💰',
    cost: 50,
    multiplier: 1.5,
    duration: 300000, // 5 минут
    bankProduct: 'Срочный депозит'
  },
  credit: {
    name: 'Кредит',
    description: 'Получите дополнительную энергию сейчас',
    icon: '💳',
    cost: 0,
    bonus: 100,
    duration: 600000, // 10 минут
    bankProduct: 'Потребительский кредит'
  },
  investment: {
    name: 'Инвестиции',
    description: 'Увеличивает доход от станции',
    icon: '📈',
    cost: 200,
    multiplier: 2.0,
    duration: 1800000, // 30 минут
    bankProduct: 'Инвестиционный портфель'
  }
};

// Уровни станции
const STATION_LEVELS = [
  {level:1, energyPerHour:10, capacity:100, name: 'Базовая станция', cost: 0},
  {level:2, energyPerHour:25, capacity:250, name: 'Улучшенная станция', cost: 100},
  {level:3, energyPerHour:50, capacity:500, name: 'Продвинутая станция', cost: 300},
  {level:4, energyPerHour:100, capacity:1000, name: 'Элитная станция', cost: 800},
  {level:5, energyPerHour:200, capacity:2000, name: 'Космическая крепость', cost: 2000},
];

let state = DEFAULT_STATE;

function load(){ 
  try{ 
    const raw = localStorage.getItem('lct_state'); 
    if(raw) state = Object.assign({}, DEFAULT_STATE, JSON.parse(raw)); 
  }catch(e){ 
    state = DEFAULT_STATE; 
  } 
}

function save(){ 
  try{ 
    localStorage.setItem('lct_state', JSON.stringify(state)); 
  }catch(e){} 
}

load();

// Инициализация начальной области вокруг планеты
function initializeDiscoveredArea() {
  if(state.discoveredAreas.length > 0) return; // уже инициализировано
  
  // Добавляем область вокруг планеты как открытую
  // Используем мировые координаты планеты
  state.discoveredAreas.push({
    x: PLANET_WORLD_X,
    y: PLANET_WORLD_Y,
    radius: 150,
    hasResources: true,
    resourceType: 'energy',
    resourceOffsetX: 30,
    resourceOffsetY: -20
  });
  
  save();
}

// Проверка, находится ли точка в открытой области
function isPointDiscovered(x, y) {
  const worldX = x + cameraX;
  const worldY = y + cameraY;
  
  for(let area of state.discoveredAreas) {
    const distance = Math.hypot(worldX - area.x, worldY - area.y);
    if(distance <= area.radius) {
      return true;
    }
  }
  return false;
}

// Открытие новой области
function revealArea(x, y) {
  const worldX = x + cameraX;
  const worldY = y + cameraY;
  
  // Определяем есть ли ресурсы в этой области
  const hasResources = Math.random() < 0.3; // 30% шанс найти ресурсы
  const resourceType = Math.random() < 0.7 ? 'energy' : 'oxygen';
  
  state.discoveredAreas.push({
    x: worldX,
    y: worldY,
    radius: FOG_RADIUS,
    hasResources: hasResources,
    resourceType: resourceType,
    resourceOffsetX: hasResources ? (Math.random() - 0.5) * (FOG_RADIUS - 20) : 0,
    resourceOffsetY: hasResources ? (Math.random() - 0.5) * (FOG_RADIUS - 20) : 0
  });
  
  // Проверяем, нужно ли добавить планету
  if(Math.random() < PLANET_SPAWN_CHANCE) {
    spawnPlanet(worldX, worldY);
  }
  
  save();
}

// Создание планеты
function spawnPlanet(x, y) {
  const planetTypes = Object.keys(PLANET_TYPES);
  const randomType = planetTypes[Math.floor(Math.random() * planetTypes.length)];
  const planetData = PLANET_TYPES[randomType];
  
  state.planets.push({
    id: Date.now() + Math.random(), // уникальный ID
    x: x,
    y: y,
    type: randomType,
    name: planetData.name,
    color: planetData.color,
    icon: planetData.icon,
    energyCost: planetData.energyCost,
    energyReward: planetData.energyReward,
    isExplored: false,
    explorationProgress: 0, // 0-100%
    isExploring: false
  });
}

// Рендеринг игры
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Космический фон
  ctx.fillStyle = '#000011';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Рисуем звезды
  for(let i = 0; i < 300; i++) {
    const x = (i * 137.5) % canvas.width;
    const y = (i * 199.3) % canvas.height;
    const brightness = Math.random() * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255,255,255,${brightness})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Рендерим туман войны
  renderFog();
  
  // Рендерим планету
  renderPlanet();
  
  // Рендерим орбитальный корабль
  renderShip();
  
  // Рендерим планеты в открытых областях
  renderPlanets();
  
  // Рендерим маршрут если есть
  renderRoute();
}

// Рендеринг тумана войны
function renderFog() {
  // Создаем градиент для тумана
  const gradient = ctx.createRadialGradient(
    canvas.width/2, canvas.height/2, 0,
    canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2
  );
  
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Рендерим открытые области
  for(let area of state.discoveredAreas) {
    let screenX, screenY;
    
    // Если это область вокруг планеты, она всегда в центре экрана
    if(area.x === PLANET_WORLD_X && area.y === PLANET_WORLD_Y) {
      screenX = PLANET_X;
      screenY = PLANET_Y;
    } else {
      // Остальные области перемещаются с камерой
      screenX = area.x - cameraX;
      screenY = area.y - cameraY;
    }
    
    // Пропускаем области вне экрана (кроме области планеты)
    if(!(area.x === PLANET_WORLD_X && area.y === PLANET_WORLD_Y)) {
      if(screenX + area.radius < 0 || screenX - area.radius > canvas.width ||
         screenY + area.radius < 0 || screenY - area.radius > canvas.height) continue;
    }
    
    // Создаем "дыру" в тумане для открытой области
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(screenX, screenY, area.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Статичные ресурсы в открытых областях (без мерцания)
    if(area.hasResources) {
      const resourceX = screenX + area.resourceOffsetX;
      const resourceY = screenY + area.resourceOffsetY;
      ctx.fillStyle = area.resourceType === 'energy' ? '#ffd200' : '#8fbfef';
      ctx.fillRect(resourceX - 4, resourceY - 4, 8, 8);
    }
  }
}

// Рендеринг планеты (пиксельное солнце)
function renderPlanet() {
  const planetX = PLANET_X;
  const planetY = PLANET_Y;
  
  ctx.save();
  ctx.translate(planetX, planetY);
  
  // Внешнее свечение
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,140,0,0.2)';
  ctx.arc(0, 0, PLANET_R + 25, 0, Math.PI * 2);
  ctx.fill();
  
  // Основное тело солнца (пиксельная текстура)
  const pixelSize = 4;
  const radius = PLANET_R;
  
  // Создаем пиксельную текстуру солнца
  for(let y = -radius; y <= radius; y += pixelSize) {
    for(let x = -radius; x <= radius; x += pixelSize) {
      const distance = Math.sqrt(x*x + y*y);
      if(distance <= radius) {
        // Определяем цвет пикселя на основе позиции
        const angle = Math.atan2(y, x);
        const normalizedDistance = distance / radius;
        
        // Ядро солнца (ярко-желтый)
        if(normalizedDistance < 0.3) {
          ctx.fillStyle = '#FFD700';
        }
        // Средняя зона (оранжевый)
        else if(normalizedDistance < 0.6) {
          ctx.fillStyle = '#FF8C00';
        }
        // Внешняя зона (красно-оранжевый)
        else if(normalizedDistance < 0.8) {
          ctx.fillStyle = '#FF4500';
        }
        // Край (темно-красный)
        else {
          ctx.fillStyle = '#DC143C';
        }
        
        // Добавляем вариации для текстуры
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.1;
        if(Math.random() < 0.3) {
          // Случайные яркие пятна (солнечные вспышки)
          ctx.fillStyle = '#FFFF00';
        }
        
        ctx.fillRect(x - pixelSize/2, y - pixelSize/2, pixelSize, pixelSize);
      }
    }
  }
  
  // Солнечные вспышки (анимированные яркие пиксели)
  ctx.fillStyle = '#FFFF00';
  for(let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + sunAnimationTime * 0.001;
    const flareRadius = radius * (0.6 + Math.sin(sunAnimationTime * 0.002 + i) * 0.2);
    const flareX = Math.cos(angle) * flareRadius;
    const flareY = Math.sin(angle) * flareRadius;
    
    // Анимированная интенсивность вспышки
    const flareIntensity = 0.7 + Math.sin(sunAnimationTime * 0.003 + i * 0.5) * 0.3;
    ctx.globalAlpha = flareIntensity;
    
    // Создаем вспышку из нескольких пикселей
    ctx.fillRect(flareX - 2, flareY - 2, 4, 4);
    ctx.fillRect(flareX - 6, flareY - 2, 4, 4);
    ctx.fillRect(flareX + 2, flareY - 2, 4, 4);
    ctx.fillRect(flareX - 2, flareY - 6, 4, 4);
    ctx.fillRect(flareX - 2, flareY + 2, 4, 4);
  }
  
  ctx.globalAlpha = 1;
  
  ctx.restore();
  
  // Орбитальная линия (зафиксирована)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.arc(planetX, planetY, PLANET_R + 30, 0, Math.PI * 2);
  ctx.stroke();
}

// Рендеринг орбитального корабля (пиксельный спутник)
function renderShip() {
  const shipX = PLANET_X + Math.cos(shipAngle) * ORBIT_RADIUS;
  const shipY = PLANET_Y + Math.sin(shipAngle) * ORBIT_RADIUS;
  
  ctx.save();
  ctx.translate(shipX, shipY);
  
  // Центральный корпус спутника
  // Основной корпус (бежевый)
  ctx.fillStyle = '#D2B48C';
  ctx.fillRect(-6, -12, 12, 24);
  
  // Тени на корпусе
  ctx.fillStyle = '#BC9A6A';
  ctx.fillRect(-6, -12, 12, 4);
  ctx.fillRect(-6, -8, 3, 16);
  
  // Светлые участки
  ctx.fillStyle = '#E6D3A3';
  ctx.fillRect(-3, -8, 3, 16);
  ctx.fillRect(-6, 8, 12, 4);
  
  // Верхняя часть (колпак)
  ctx.fillStyle = '#C4A484';
  ctx.fillRect(-4, -16, 8, 4);
  
  // Нижняя часть (основание)
  ctx.fillStyle = '#A68B5B';
  ctx.fillRect(-5, 12, 10, 3);
  
  // Панель на передней части
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(-2, -4, 4, 8);
  
  // Солнечные панели
  // Левая панель
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(-18, -8, 12, 16);
  
  // Правая панель
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(6, -8, 12, 16);
  
  // Сетка на солнечных панелях
  ctx.fillStyle = '#4682B4';
  for(let i = 0; i < 3; i++) {
    for(let j = 0; j < 4; j++) {
      // Левая панель
      ctx.fillRect(-18 + i * 4, -8 + j * 4, 3, 3);
      // Правая панель
      ctx.fillRect(6 + i * 4, -8 + j * 4, 3, 3);
    }
  }
  
  // Соединительные элементы
  ctx.fillStyle = '#808080';
  ctx.fillRect(-12, -4, 6, 8);
  ctx.fillRect(6, -4, 6, 8);
  
  ctx.restore();
}

// Рендеринг планет в открытых областях
function renderPlanets() {
  for(let planet of state.planets) {
    const screenX = planet.x - cameraX;
    const screenY = planet.y - cameraY;
    
    // Пропускаем планеты вне экрана
    if(screenX + PLANET_RADIUS < 0 || screenX - PLANET_RADIUS > canvas.width ||
       screenY + PLANET_RADIUS < 0 || screenY - PLANET_RADIUS > canvas.height) continue;
    
    // Рендерим планету
    ctx.save();
    ctx.translate(screenX, screenY);
    
    // Основа планеты
    ctx.beginPath();
    ctx.fillStyle = planet.color;
    ctx.arc(0, 0, PLANET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // Граница планеты
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Иконка планеты
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(planet.icon, 0, 0);
    
    // Прогресс исследования
    if(planet.isExploring) {
      ctx.beginPath();
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 4;
      ctx.arc(0, 0, PLANET_RADIUS + 10, -Math.PI/2, -Math.PI/2 + (planet.explorationProgress / 100) * Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Кнопка исследования под планетой
    if(!planet.isExplored && !planet.isExploring) {
      const buttonY = screenY + PLANET_RADIUS + 20;
      if(buttonY < canvas.height - 50) { // Не показываем кнопку если она за экраном
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(screenX - 40, buttonY, 80, 25);
        
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - 40, buttonY, 80, 25);
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText(`Освоить (${planet.energyCost})`, screenX, buttonY + 12);
      }
    }
    
    // Статус планеты
    if(planet.isExplored) {
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('✓ Освоена', screenX, screenY - PLANET_RADIUS - 10);
    }
  }
}

// Рендеринг маршрута (зафиксирован относительно планеты)
function renderRoute() {
  if(!routePreview || !routePreview.show) return;
  
  // Маршрут всегда идет от центра планеты к точке клика
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(PLANET_X, PLANET_Y);
  ctx.lineTo(routePreview.tx, routePreview.ty);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Целевая точка (зафиксирована на экране)
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(routePreview.tx, routePreview.ty, 6, 0, Math.PI * 2);
  ctx.fill();
}

// Получение планеты по позиции клика
function getPlanetAtPosition(x, y) {
  for(let planet of state.planets) {
    const screenX = planet.x - cameraX;
    const screenY = planet.y - cameraY;
    
    // Проверяем клик по планете
    const dx = x - screenX;
    const dy = y - screenY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if(distance <= PLANET_RADIUS) {
      return planet;
    }
    
    // Проверяем клик по кнопке исследования
    if(!planet.isExplored && !planet.isExploring) {
      const buttonY = screenY + PLANET_RADIUS + 20;
      if(buttonY < canvas.height - 50) {
        const buttonX = screenX;
        if(Math.abs(x - buttonX) <= 40 && Math.abs(y - buttonY - 12) <= 12) {
          return planet;
        }
      }
    }
  }
  return null;
}

// Обработка клика по планете
function handlePlanetClick(planet) {
  if(planet.isExplored) {
    alert(`✅ ${planet.name} уже освоен!\nПолучено энергии: ${planet.energyReward}`);
    return;
  }
  
  if(planet.isExploring) {
    alert(`🔍 ${planet.name} уже изучается!\nПрогресс: ${Math.floor(planet.explorationProgress)}%`);
    return;
  }
  
  // Проверяем достаточно ли энергии
  if(state.energy < planet.energyCost) {
    alert(`❌ Недостаточно энергии для освоения!\nНужно: ${planet.energyCost}\nУ вас: ${Math.floor(state.energy)}`);
    return;
  }
  
  // Начинаем исследование
  state.energy -= planet.energyCost;
  planet.isExploring = true;
  planet.explorationProgress = 0;
  
  alert(`🚀 Начинаем освоение ${planet.name}!\nИнвестиции: ${planet.energyCost} энергии`);
  
  save();
  updateUI();
}

// Обновление UI
function updateUI() {
  const lvl = STATION_LEVELS.find(l => l.level === state.stationLevel) || STATION_LEVELS[0];
  energyValEl.textContent = Math.floor(state.energy);
  energyCapEl.textContent = lvl.capacity;
  energyRateEl.textContent = lvl.energyPerHour + ' / час';
  oxyValEl.textContent = '100'; // Фиксированное значение кислорода
}

// Основной игровой цикл
let lastTick = performance.now();
function tick(now) {
  const ms = now || performance.now();
  const dt = Math.min(200, ms - lastTick);
  lastTick = ms;
  
  // Обработка активных бустеров
  const nowTime = Date.now();
  state.boosters = state.boosters.filter(booster => {
    const elapsed = nowTime - booster.startTime;
    return elapsed < booster.duration;
  });
  
  // Расчет дохода с учетом бустеров
  const lvl = STATION_LEVELS.find(l => l.level === state.stationLevel) || STATION_LEVELS[0];
  let perSec = lvl.energyPerHour / 3600.0;
  
  // Применяем бустеры
  state.boosters.forEach(booster => {
    const boosterData = BANK_BOOSTERS[booster.type];
    if(boosterData.multiplier) {
      perSec *= boosterData.multiplier;
    }
  });
  
  state.energy = Math.min(lvl.capacity, state.energy + perSec * (dt/1000));
  
  // Обновляем угол орбитального корабля
  shipAngle += 0.001 * dt;
  if(shipAngle > Math.PI * 2) shipAngle -= Math.PI * 2;
  
  // Обновляем анимацию солнца
  sunAnimationTime += dt;
  
  // Обновляем исследование планет
  updatePlanetExploration(dt);
  
  save();
  updateUI();
  render();
  requestAnimationFrame(tick);
}

// Обновление исследования планет
function updatePlanetExploration(dt) {
  for(let planet of state.planets) {
    if(planet.isExploring && !planet.isExplored) {
      // Увеличиваем прогресс исследования (1% в секунду)
      planet.explorationProgress += dt * 0.01;
      
      if(planet.explorationProgress >= 100) {
        planet.explorationProgress = 100;
        planet.isExploring = false;
        planet.isExplored = true;
        
        // Даем награду
        const lvl = STATION_LEVELS.find(l => l.level === state.stationLevel) || STATION_LEVELS[0];
        state.energy = Math.min(lvl.capacity, state.energy + planet.energyReward);
        
        alert(`🎉 ${planet.name} успешно освоен!\nДоход: ${planet.energyReward} энергии`);
      }
    }
  }
}

// Обработчики событий
let routePreview = null;

canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Проверяем клик по планете
  const clickedPlanet = getPlanetAtPosition(x, y);
  if(clickedPlanet) {
    handlePlanetClick(clickedPlanet);
    return;
  }
  
  // Проверяем кислород перед полетом (фиксированное значение)
  const requiredOxygen = 5;
  alert(`🚀 Запуск полета!\nКислород: ${requiredOxygen} единиц`);
  
  // Открываем область
  revealArea(x, y);
  
  // Рассчитываем маршрут
  const angleToTarget = Math.atan2(y - PLANET_Y, x - PLANET_X);
  routePreview = { 
    startX: PLANET_X, 
    startY: PLANET_Y, 
    tx: x, 
    ty: y, 
    angleToTarget: angleToTarget, 
    show: false 
  };
  
  setTimeout(() => {
    if(!routePreview) return;
    routePreview.show = true;
    
    // Запускаем мини-игру
    setTimeout(() => {
    const mg = createMinigame({ route: routePreview });
      mg.start(() => {
        const lvl = STATION_LEVELS.find(l => l.level === state.stationLevel) || STATION_LEVELS[0];
        state.energy = Math.min(lvl.capacity, state.energy + (mg.collectedEnergy || 0));
        // Кислород не сохраняется в глобальном состоянии - он локальная переменная
        
        if(mg.foundBoosters && mg.foundBoosters.length) {
          mg.foundBoosters.forEach(booster => {
            state.boosters.push({
              type: booster.type,
              startTime: Date.now(),
              duration: BANK_BOOSTERS[booster.type].duration
            });
          });
          
          const boosterNames = mg.foundBoosters.map(b => BANK_BOOSTERS[b.type].name).join(', ');
          alert(`🎉 Найден космический груз!\nПолучены бустеры: ${boosterNames}`);
        }
        
        routePreview = null;
        save();
        updateUI();
      });
    }, 1000);
  }, 500);
});

// Прокрутка камеры
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', function(e) {
  if(e.button === 1 || e.ctrlKey) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    e.preventDefault();
  }
});

canvas.addEventListener('mousemove', function(e) {
  if(isDragging) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    cameraX = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, cameraX - deltaX));
    cameraY = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, cameraY - deltaY));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    e.preventDefault();
  }
});

canvas.addEventListener('mouseup', function(e) {
  isDragging = false;
});

// Мини-игра
function createMinigame(options) {
    const route = options.route || null;
  const mgCanvas = document.createElement('canvas');
  mgCanvas.width = canvas.width;
  mgCanvas.height = canvas.height;
  mgCanvas.style.position = 'absolute';
  mgCanvas.style.left = '0';
  mgCanvas.style.top = '0';
    const mgCtx = mgCanvas.getContext('2d');
  document.getElementById('gridOverlay').appendChild(mgCanvas);
  
  // Создаем UI для мини-игры согласно макету
  const minigameUI = document.createElement('div');
  minigameUI.id = 'minigameUI';
  minigameUI.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: rgba(0,0,17,0.95);
    backdrop-filter: blur(15px);
    border-top: 1px solid rgba(255,255,255,0.1);
    z-index: 200;
    display: flex;
    align-items: center;
    padding: 0 20px;
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    color: white;
    transform: none !important;
    top: auto !important;
  `;
  
  // Левая секция - кислород и энергия
  const leftSection = document.createElement('div');
  leftSection.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  
  const oxygenBar = document.createElement('div');
  oxygenBar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  oxygenBar.innerHTML = `
    <span style="font-size: 14px; color: #4fc3f7;">Кислород</span>
    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
      <div id="mgOxygenBar" style="height: 100%; background: linear-gradient(90deg, #4fc3f7, #29b6f6); width: 100%; transition: width 0.3s ease;"></div>
    </div>
    <span id="mgOxygen" style="font-size: 12px; color: #4fc3f7; min-width: 30px;">100</span>
  `;
  
  const energyBar = document.createElement('div');
  energyBar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  energyBar.innerHTML = `
    <span style="font-size: 14px; color: #ffd200;">Энергия</span>
    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
      <div id="mgEnergyBar" style="height: 100%; background: linear-gradient(90deg, #ffd200, #ffed4e); width: 0%; transition: width 0.3s ease;"></div>
    </div>
    <span id="mgEnergy" style="font-size: 12px; color: #ffd200; min-width: 30px;">0</span>
  `;
  
  leftSection.appendChild(oxygenBar);
  leftSection.appendChild(energyBar);
  
  // Правая секция - бустеры
  const rightSection = document.createElement('div');
  rightSection.style.cssText = `
    width: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  `;
  
  rightSection.innerHTML = `
    <span style="font-size: 12px; color: #888;">Бустеры</span>
    <div style="display: flex; gap: 8px;">
      <div id="booster1" class="booster-slot" style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;"></div>
      <div id="booster2" class="booster-slot" style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;"></div>
      <div id="booster3" class="booster-slot" style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;"></div>
    </div>
  `;
  
  minigameUI.appendChild(leftSection);
  minigameUI.appendChild(rightSection);
  document.body.appendChild(minigameUI);
  
  const shuttle = {x: canvas.width/2, y: canvas.height - 140, w: 28, h: 40}; // Сдвинуто выше, чтобы не перекрывалось с UI
  let running = false;
  let last = performance.now();
  const asteroids = [];
  const pickups = [];
  let spawnTimer = 0;
  let timeElapsed = 0;
  let oxygen = 100; // Локальная переменная кислорода
  let collectedEnergy = 0;
  const foundBoosters = [];
  let boosterSpawnTimer = 0;
  let maxBoosters = 3;
  let currentBoosters = 0;
  
  function spawnAsteroid() {
    const size = Math.random() < 0.6 ? 'small' : Math.random() < 0.85 ? 'medium' : 'large';
    // Разная скорость для астероидов
    const speedVariation = 0.3 + Math.random() * 0.7; // от 0.3 до 1.0
    const sizes = { 
      small: {r: 6, baseVy: 3.0}, // Увеличено с 1.5 до 3.0
      medium: {r: 12, baseVy: 2.5}, // Увеличено с 1.2 до 2.5
      large: {r: 20, baseVy: 2.0} // Увеличено с 0.8 до 2.0
    };
    asteroids.push({
      x: Math.random() * (canvas.width - 40) + 20,
      y: -30,
      r: sizes[size].r,
      vy: sizes[size].baseVy * speedVariation,
      size: size,
      rotation: Math.random() * Math.PI * 2
    });
  }
  
  function spawnPickup(type) {
    // Разная скорость для пикапов (увеличена)
    const speedVariation = 1.0 + Math.random() * 1.5; // от 1.0 до 2.5
    pickups.push({
      x: Math.random() * (canvas.width - 32) + 16,
      y: -20,
      type,
      vy: speedVariation,
      rotation: 0,
      pulse: 0
    });
  }
  
  function spawnBooster() {
    const boosterTypes = ['deposit', 'credit', 'investment'];
    const randomType = boosterTypes[Math.floor(Math.random() * boosterTypes.length)];
    
    pickups.push({
      x: Math.random() * (canvas.width - 32) + 16,
      y: -20,
      type: 'booster',
      boosterType: randomType,
      vy: 0.6 + Math.random() * 0.4, // от 0.6 до 1.0
      rotation: 0,
      pulse: 0
    });
  }
  
  function updateBoosterUI() {
    const boosterSlots = ['booster1', 'booster2', 'booster3'];
    const boosterIcons = {
      deposit: '💰',
      credit: '💳',
      investment: '📈'
    };
    
    for(let i = 0; i < maxBoosters; i++) {
      const slot = document.getElementById(boosterSlots[i]);
      if(i < currentBoosters && foundBoosters[i]) {
        slot.textContent = boosterIcons[foundBoosters[i].type] || '?';
        slot.style.background = 'rgba(255,210,0,0.2)';
        slot.style.borderColor = 'rgba(255,210,0,0.5)';
      } else {
        slot.textContent = '';
        slot.style.background = 'rgba(255,255,255,0.1)';
        slot.style.borderColor = 'rgba(255,255,255,0.2)';
      }
    }
  }
  
  function maybeSpawnCargo() {
    if(!state.sessionCargoSpawned && Math.random() < 0.12) {
      pickups.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -20,
        type: 'cargo',
        vy: 1.1,
        rotation: 0,
        pulse: 0,
        glow: 0
      });
      state.sessionCargoSpawned = true;
      save();
    }
  }
  
  // Управление
    const keys = {};
  function onKeyDown(e) { keys[e.key] = true; }
  function onKeyUp(e) { keys[e.key] = false; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  
  function onTouch(e) {
    e.preventDefault();
    const rect = mgCanvas.getBoundingClientRect();
    const tx = (e.touches && e.touches[0]) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    if(tx < mgCanvas.width/2) {
      keys.ArrowLeft = true;
      keys.ArrowRight = false;
    } else {
      keys.ArrowRight = true;
      keys.ArrowLeft = false;
    }
  }
  
  function onTouchEnd() {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }
  
  mgCanvas.addEventListener('touchstart', onTouch);
  mgCanvas.addEventListener('touchmove', onTouch);
  mgCanvas.addEventListener('touchend', onTouchEnd);
  mgCanvas.addEventListener('mousedown', onTouch);
  mgCanvas.addEventListener('mouseup', onTouchEnd);
  
  // Продолжительность игры зависит от кислорода
  let distance = 0;
  const maxFlightTime = Math.floor(oxygen / 5) * 1000;
  
  function step(now) {
    const dt = Math.min(40, now - last);
    last = now;
    if(!running) return;
    
    timeElapsed += dt;
    spawnTimer += dt;
    
    // Прогрессивная скорость полета в зависимости от расстояния (значительно увеличена)
    const baseSpeed = 0.15; // Увеличено с 0.05 до 0.15
    const speedMultiplier = 1 + (distance / 300) * 1.2; // Увеличиваем скорость на 120% каждые 300 единиц расстояния
    const ascentSpeed = baseSpeed * speedMultiplier;
    distance += dt * ascentSpeed;

    // Спавн объектов (увеличено количество)
    if(spawnTimer > 500) { // Уменьшен интервал с 700 до 500
      spawnTimer = 0;
      if(Math.random() < 0.9) spawnAsteroid(); // Увеличено с 0.7 до 0.9
      if(Math.random() < 0.4) spawnPickup(Math.random() < 0.6 ? 'oxygen' : 'energy'); // Увеличено с 0.35 до 0.4
      maybeSpawnCargo();
    }
    
    // Спавн бустеров каждые 30 секунд (максимум 3 за сессию)
    boosterSpawnTimer += dt;
    if(boosterSpawnTimer >= 30000 && currentBoosters < maxBoosters) { // 30 секунд = 30000мс
      boosterSpawnTimer = 0;
      spawnBooster();
    }
    
    // Управление шатлом (увеличена скорость маневра)
    if(keys.ArrowLeft) shuttle.x -= 0.4 * dt;
    if(keys.ArrowRight) shuttle.x += 0.4 * dt;
    shuttle.x = Math.max(18, Math.min(canvas.width - 18, shuttle.x));
    
    // Обновление объектов
    for(let a of asteroids) {
      a.y += a.vy * (dt/16);
      a.rotation += dt * 0.002;
    }
    
    for(let p of pickups) {
      p.y += p.vy * (dt/16);
      p.rotation += dt * 0.001;
      p.pulse += dt * 0.003;
      if(p.type === 'cargo') p.glow += dt * 0.005;
    }
    
    // Коллизии с астероидами
    for(let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      const dx = a.x - shuttle.x;
      const dy = a.y - shuttle.y;
      const dist = Math.hypot(dx, dy);
      if(dist < a.r + 12) {
        oxygen -= 40;
        asteroids.splice(i, 1);
      }
    }
    
    // Коллизии с пикапами
    for(let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const dx = p.x - shuttle.x;
      const dy = p.y - shuttle.y;
      if(Math.hypot(dx, dy) < 18) {
        if(p.type === 'oxygen') {
          oxygen = Math.min(200, oxygen + 60);
        } else if(p.type === 'energy') {
          collectedEnergy += 15 + Math.random() * 20;
        } else if(p.type === 'booster') {
          if(currentBoosters < maxBoosters) {
            foundBoosters.push({type: p.boosterType});
            currentBoosters++;
            updateBoosterUI();
          }
        } else if(p.type === 'cargo') {
          const boosterTypes = Object.keys(BANK_BOOSTERS);
          const randomBooster = boosterTypes[Math.floor(Math.random() * boosterTypes.length)];
          foundBoosters.push({
            type: randomBooster,
            value: BANK_BOOSTERS[randomBooster].cost || 50
          });
          collectedEnergy += 80;
          state.missionsCompleted++;
        }
        pickups.splice(i, 1);
      }
    }
    
    // Расход кислорода (замедлен)
      if(typeof step._oxyAcc === 'undefined') step._oxyAcc = 0;
      step._oxyAcc += dt;
    const oxyInterval = 300; // Увеличен интервал с 200 до 300мс
    if(step._oxyAcc >= oxyInterval) {
        const steps = Math.floor(step._oxyAcc / oxyInterval);
        step._oxyAcc = step._oxyAcc % oxyInterval;
      const oxyPerStep = 1;
        oxygen -= oxyPerStep * steps;
      }

    // Обновляем UI мини-игры
    const mgOxygenEl = document.getElementById('mgOxygen');
    const mgEnergyEl = document.getElementById('mgEnergy');
    const mgOxygenBar = document.getElementById('mgOxygenBar');
    const mgEnergyBar = document.getElementById('mgEnergyBar');
    
    if(mgOxygenEl) mgOxygenEl.textContent = Math.floor(oxygen);
    if(mgEnergyEl) mgEnergyEl.textContent = collectedEnergy;
    if(mgOxygenBar) mgOxygenBar.style.width = `${Math.max(0, Math.min(100, oxygen))}%`;
    if(mgEnergyBar) mgEnergyBar.style.width = `${Math.min(100, (collectedEnergy / 100) * 100)}%`;

    // Условия завершения (только по кислороду)
    const minRunMs = 2000;
    if(oxygen <= 0 || timeElapsed > 120000) { // Увеличено время до 2 минут, убрано ограничение по maxFlightTime
      mgCanvas._lastX = shuttle.x;
      mgCanvas._lastY = canvas.height - distance/2;
      running = false;
      end();
      return;
    }
    
    // Рендеринг мини-игры
    mgCtx.clearRect(0, 0, mgCanvas.width, mgCanvas.height);
    
    // Рендерим пикапы
    for(let p of pickups) {
      mgCtx.save();
      mgCtx.translate(p.x, p.y);
      mgCtx.rotate(p.rotation);
      
      if(p.type === 'oxygen') {
        const pulse = Math.sin(p.pulse) * 0.2 + 0.8;
        mgCtx.fillStyle = `rgba(143,191,239,${pulse})`;
        mgCtx.fillRect(-8, -8, 16, 16);
        mgCtx.fillStyle = '#ffffff';
        mgCtx.fillRect(-4, -4, 8, 8);
      } else if(p.type === 'energy') {
        const pulse = Math.sin(p.pulse) * 0.3 + 0.7;
        mgCtx.fillStyle = `rgba(255,210,0,${pulse})`;
        mgCtx.fillRect(-8, -8, 16, 16);
        mgCtx.fillStyle = '#ffffff';
        mgCtx.fillRect(-3, -3, 6, 6);
      } else if(p.type === 'booster') {
        const pulse = Math.sin(p.pulse) * 0.4 + 0.6;
        mgCtx.fillStyle = `rgba(255,100,100,${pulse})`;
        mgCtx.fillRect(-10, -10, 20, 20);
        mgCtx.fillStyle = '#ffffff';
        mgCtx.font = '12px Arial';
        mgCtx.textAlign = 'center';
        mgCtx.textBaseline = 'middle';
        const boosterIcons = { deposit: '💰', credit: '💳', investment: '📈' };
        mgCtx.fillText(boosterIcons[p.boosterType] || '?', 0, 0);
      } else if(p.type === 'cargo') {
        const glow = Math.sin(p.glow) * 0.5 + 0.5;
        mgCtx.fillStyle = `rgba(207,207,207,${glow})`;
        mgCtx.fillRect(-14, -10, 28, 20);
        mgCtx.fillStyle = '#ffd200';
        mgCtx.fillRect(-8, -4, 16, 8);
      }
      mgCtx.restore();
    }
    
    // Рендерим астероиды
    for(let a of asteroids) {
      mgCtx.save();
      mgCtx.translate(a.x, a.y);
      mgCtx.rotate(a.rotation);
      
      const colors = { small: '#999', medium: '#777', large: '#555' };
      mgCtx.fillStyle = colors[a.size];
      mgCtx.beginPath();
      mgCtx.arc(0, 0, a.r, 0, Math.PI * 2);
      mgCtx.fill();
      
      mgCtx.fillStyle = '#444';
      mgCtx.fillRect(-a.r/3, -a.r/3, a.r/2, a.r/2);
      mgCtx.restore();
    }
    
    // Рендерим шатл (пиксельный спутник)
    mgCtx.save();
    mgCtx.translate(shuttle.x, shuttle.y);
    
    // Центральный корпус спутника
    // Основной корпус (бежевый)
    mgCtx.fillStyle = '#D2B48C';
    mgCtx.fillRect(-8, -16, 16, 32);
    
    // Тени на корпусе
    mgCtx.fillStyle = '#BC9A6A';
    mgCtx.fillRect(-8, -16, 16, 6);
    mgCtx.fillRect(-8, -10, 4, 20);
    
    // Светлые участки
    mgCtx.fillStyle = '#E6D3A3';
    mgCtx.fillRect(-4, -10, 4, 20);
    mgCtx.fillRect(-8, 10, 16, 6);
    
    // Верхняя часть (колпак)
    mgCtx.fillStyle = '#C4A484';
    mgCtx.fillRect(-6, -22, 12, 6);
    
    // Нижняя часть (основание)
    mgCtx.fillStyle = '#A68B5B';
    mgCtx.fillRect(-7, 16, 14, 4);
    
    // Панель на передней части
    mgCtx.fillStyle = '#2C2C2C';
    mgCtx.fillRect(-3, -6, 6, 12);
    
    // Солнечные панели
    // Левая панель
    mgCtx.fillStyle = '#87CEEB';
    mgCtx.fillRect(-24, -10, 16, 20);
    
    // Правая панель
    mgCtx.fillStyle = '#87CEEB';
    mgCtx.fillRect(8, -10, 16, 20);
    
    // Сетка на солнечных панелях
    mgCtx.fillStyle = '#4682B4';
    for(let i = 0; i < 4; i++) {
      for(let j = 0; j < 5; j++) {
        // Левая панель
        mgCtx.fillRect(-24 + i * 4, -10 + j * 4, 3, 3);
        // Правая панель
        mgCtx.fillRect(8 + i * 4, -10 + j * 4, 3, 3);
      }
    }
    
    // Соединительные элементы
    mgCtx.fillStyle = '#808080';
    mgCtx.fillRect(-16, -5, 8, 10);
    mgCtx.fillRect(8, -5, 8, 10);
    
    // Двигатели (красные)
    mgCtx.fillStyle = '#ff6b6b';
    mgCtx.fillRect(-3, 20, 6, 8);
    
    mgCtx.restore();

      // HUD
    mgCtx.fillStyle = '#fff';
    mgCtx.font = '14px sans-serif';
    mgCtx.fillText('Oxygen: ' + Math.floor(oxygen), 10, 20);
    mgCtx.fillText('Energy: ' + Math.floor(collectedEnergy), 10, 40);

      requestAnimationFrame(step);
    }

  function start(onEnd) {
    running = true;
    last = performance.now();
      step._oxyAcc = 0;
    requestAnimationFrame(step);
    mgCanvas._onEnd = onEnd;
  }
  
  function end() {
    mgCanvas._lastX = shuttle.x;
    mgCanvas._lastY = canvas.height - distance/2;
    document.getElementById('gridOverlay').removeChild(mgCanvas);
    const minigameUI = document.getElementById('minigameUI');
    if(minigameUI) minigameUI.remove();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    mgCanvas.removeEventListener('touchstart', onTouch);
    mgCanvas.removeEventListener('touchmove', onTouch);
    mgCanvas.removeEventListener('touchend', onTouchEnd);
    mgCanvas.removeEventListener('mousedown', onTouch);
    mgCanvas.removeEventListener('mouseup', onTouchEnd);
    if(mgCanvas._onEnd) mgCanvas._onEnd();
  }
  
  return {
    start,
    end,
    get oxygen() { return oxygen; },
    get collectedEnergy() { return collectedEnergy; },
    foundBoosters,
    get lastX() { return mgCanvas._lastX; },
    get lastY() { return mgCanvas._lastY; }
  };
}

// Меню станции
upgradeBtn.addEventListener('click', () => {
  const currentLevel = STATION_LEVELS.find(l => l.level === state.stationLevel);
  const nextLevel = STATION_LEVELS.find(l => l.level === state.stationLevel + 1);
  
  let boosterHTML = '';
  Object.keys(BANK_BOOSTERS).forEach(key => {
    const booster = BANK_BOOSTERS[key];
    const canAfford = state.energy >= booster.cost;
    boosterHTML += `
      <div style="border:1px solid #333; padding:8px; margin:4px 0; border-radius:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">${booster.icon}</span>
          <div>
            <div style="font-weight:bold;">${booster.name}</div>
            <div style="font-size:12px; color:#888;">${booster.description}</div>
            <div style="font-size:11px; color:#aaa;">Продукт: ${booster.bankProduct}</div>
          </div>
          <button id="useBooster_${key}" ${!canAfford ? 'disabled' : ''} style="margin-left:auto; padding:4px 8px; background:#333; color:#fff; border:none; border-radius:4px;">
            ${booster.cost === 0 ? 'Получить' : `Использовать (${booster.cost})`}
          </button>
        </div>
      </div>
    `;
  });
  
  panelContent.innerHTML = `
    <h3>🚀 Планшет станции</h3>
    <div style="margin-bottom:12px;">
      <div><strong>${currentLevel.name}</strong> (Уровень ${state.stationLevel})</div>
      <div>Энергия: ${Math.floor(state.energy)}/${currentLevel.capacity}</div>
      <div>Доход: ${currentLevel.energyPerHour} энергии/час</div>
      <div>Кислород: ${state.oxygen}</div>
    </div>
    
    ${nextLevel ? `
      <div style="border:1px solid #444; padding:8px; margin:8px 0; border-radius:4px;">
        <div><strong>Следующий уровень: ${nextLevel.name}</strong></div>
        <div>Стоимость: ${nextLevel.cost} энергии</div>
        <div>Новый доход: ${nextLevel.energyPerHour} энергии/час</div>
        <div>Новая ёмкость: ${nextLevel.capacity}</div>
        <button id='buyLevel' ${state.energy < nextLevel.cost ? 'disabled' : ''} style="margin-top:8px; padding:6px 12px; background:#ffd200; color:#000; border:none; border-radius:4px; font-weight:bold;">
          Улучшить за ${nextLevel.cost} энергии
        </button>
      </div>
    ` : '<div style="color:#888;">Максимальный уровень достигнут!</div>'}
    
    <h4 style="margin-top:16px;">💼 Банковские продукты</h4>
    ${boosterHTML}
    
    <div style="margin-top:12px; font-size:12px; color:#888;">
      Найдено бустеров: ${state.boosters.length}
    </div>
  `;
  
  panel.classList.remove('hidden');
  
  // Обработчики для улучшения станции
  const buyLevelBtn = document.getElementById('buyLevel');
  if(buyLevelBtn) {
    buyLevelBtn.addEventListener('click', () => {
      if(state.energy >= nextLevel.cost && state.stationLevel < STATION_LEVELS.length) {
        state.energy -= nextLevel.cost;
        state.stationLevel++;
        save();
        panel.classList.add('hidden');
    updateUI();
      }
    });
  }
  
  // Обработчики для бустеров
  Object.keys(BANK_BOOSTERS).forEach(key => {
    const btn = document.getElementById(`useBooster_${key}`);
    if(btn) {
      btn.addEventListener('click', () => {
        const booster = BANK_BOOSTERS[key];
        if(state.energy >= booster.cost) {
          state.energy -= booster.cost;
          if(booster.bonus) state.energy += booster.bonus;
          
          state.boosters.push({
            type: key,
            startTime: Date.now(),
            duration: booster.duration
          });
          
          save();
updateUI();
          panel.classList.add('hidden');
          
          alert(`Бустер "${booster.name}" активирован!\n${booster.description}`);
        }
      });
    }
  });
});

// Закрытие панели
closePanel.addEventListener('click', () => {
  panel.classList.add('hidden');
});

// Инициализация
initializeDiscoveredArea();
render();
requestAnimationFrame(tick);
updateUI();